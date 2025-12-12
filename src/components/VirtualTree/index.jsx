import { useState, useRef, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import TreeNode from './TreeNode';
import './VirtualTree.css';

const VirtualTree = forwardRef(({ 
  data = [], 
  itemMinHeight = 32,
  overscan = 5,
  onNodeClick,
  onNodeExpand,
  draggable = true,
  onDrop
}, ref) => {
  const [expandedKeys, setExpandedKeys] = useState(new Set());
  const [flattenedData, setFlattenedData] = useState([]);
  const [nodeHeights, setNodeHeights] = useState({});
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);
  const heightCacheRef = useRef({});
  const [dragState, setDragState] = useState({
    dragging: false,
    dragNode: null,
    dropPosition: null,
    dropNode: null
  });

  // 获取所有节点的key
  const getAllKeys = useCallback((nodes) => {
    const keys = [];
    const traverse = (items) => {
      items.forEach(node => {
        if (node.children && node.children.length > 0) {
          keys.push(node.key);
          traverse(node.children);
        }
      });
    };
    traverse(nodes);
    return keys;
  }, []);

  // 暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    expandAll: () => {
      const allKeys = getAllKeys(data);
      setExpandedKeys(new Set(allKeys));
    },
    collapseAll: () => {
      setExpandedKeys(new Set());
    }
  }), [data, getAllKeys]);

  // 扁平化树数据
  const flattenTree = useCallback((nodes, level = 0, parentKey = null) => {
    const result = [];
    
    nodes.forEach((node, index) => {
      const key = node.key || `${parentKey}-${index}`;
      const item = {
        ...node,
        key,
        level,
        parentKey,
        hasChildren: node.children && node.children.length > 0,
        isExpanded: expandedKeys.has(key)
      };
      
      result.push(item);
      
      if (item.hasChildren && item.isExpanded) {
        result.push(...flattenTree(node.children, level + 1, key));
      }
    });
    
    return result;
  }, [expandedKeys]);

  // 更新扁平化数据
  useEffect(() => {
    const flattened = flattenTree(data);
    setFlattenedData(flattened);
  }, [data, flattenTree]);

  // 监听window滚动事件
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const containerTop = rect.top;
      
      // 计算容器相对于视口的滚动位置
      // 如果容器顶部在视口上方，scrollTop为正值
      const newScrollTop = Math.max(0, -containerTop);
      setScrollTop(newScrollTop);
    };

    // 初始化滚动位置
    handleScroll();
    
    // 监听滚动事件
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 切换展开/收起
  const toggleExpand = useCallback((key) => {
    setExpandedKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
    
    if (onNodeExpand) {
      onNodeExpand(key, !expandedKeys.has(key));
    }
  }, [expandedKeys, onNodeExpand]);

  // 更新节点高度
  const updateNodeHeight = useCallback((key, height) => {
    if (heightCacheRef.current[key] !== height) {
      heightCacheRef.current[key] = height;
      setNodeHeights(prev => ({
        ...prev,
        [key]: height
      }));
    }
  }, []);

  // 计算节点位置和总高度
  const { positions, totalHeight } = useMemo(() => {
    const positions = [];
    let currentTop = 0;
    
    flattenedData.forEach((node) => {
      const height = nodeHeights[node.key] || itemMinHeight;
      positions.push({
        key: node.key,
        top: currentTop,
        height
      });
      currentTop += height;
    });
    
    return {
      positions,
      totalHeight: currentTop
    };
  }, [flattenedData, nodeHeights, itemMinHeight]);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    if (positions.length === 0) {
      return { start: 0, end: 0 };
    }

    if (!containerRef.current) {
      return { start: 0, end: Math.min(20, positions.length - 1) };
    }

    const rect = containerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // 计算视口内可见的范围
    const viewportTop = Math.max(0, -rect.top);
    const viewportBottom = viewportTop + viewportHeight;
    
    // 找到第一个可见节点
    let start = 0;
    for (let i = 0; i < positions.length; i++) {
      if (positions[i].top + positions[i].height >= viewportTop) {
        start = Math.max(0, i - overscan);
        break;
      }
    }
    
    // 找到最后一个可见节点
    let end = positions.length - 1;
    for (let i = start; i < positions.length; i++) {
      if (positions[i].top > viewportBottom) {
        end = Math.min(positions.length - 1, i + overscan);
        break;
      }
    }
    
    return { start, end };
  }, [positions, scrollTop, overscan]);

  // 获取可见节点
  const visibleNodes = useMemo(() => {
    return flattenedData.slice(visibleRange.start, visibleRange.end + 1).map((node, index) => {
      const position = positions[visibleRange.start + index];
      return {
        ...node,
        style: {
          position: 'absolute',
          top: position.top,
          left: 0,
          right: 0,
          minHeight: itemMinHeight
        }
      };
    });
  }, [flattenedData, visibleRange, positions, itemMinHeight]);

  // 拖拽开始
  const handleDragStart = useCallback((e, node) => {
    if (!draggable) return;
    
    e.dataTransfer.effectAllowed = 'move';
    setDragState({
      dragging: true,
      dragNode: node,
      dropPosition: null,
      dropNode: null
    });
  }, [draggable]);

  // 拖拽经过
  const handleDragOver = useCallback((e, node, position) => {
    if (!draggable || !dragState.dragging) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    setDragState(prev => ({
      ...prev,
      dropPosition: position,
      dropNode: node
    }));
  }, [draggable, dragState.dragging]);

  // 拖拽离开
  const handleDragLeave = useCallback(() => {
    if (!draggable) return;
    
    setDragState(prev => ({
      ...prev,
      dropPosition: null,
      dropNode: null
    }));
  }, [draggable]);

  // 放置
  const handleDrop = useCallback((e, dropNode, position) => {
    if (!draggable || !dragState.dragNode) return;
    
    e.preventDefault();
    
    const { dragNode } = dragState;
    
    // 不能拖到自己或自己的子节点
    if (dragNode.key === dropNode.key) {
      setDragState({
        dragging: false,
        dragNode: null,
        dropPosition: null,
        dropNode: null
      });
      return;
    }
    
    if (onDrop) {
      onDrop({
        dragNode,
        dropNode,
        position // 'before', 'after', 'inside'
      });
    }
    
    setDragState({
      dragging: false,
      dragNode: null,
      dropPosition: null,
      dropNode: null
    });
  }, [draggable, dragState, onDrop]);

  // 拖拽结束
  const handleDragEnd = useCallback(() => {
    setDragState({
      dragging: false,
      dragNode: null,
      dropPosition: null,
      dropNode: null
    });
  }, []);

  return (
    <div 
      ref={containerRef}
      className="virtual-tree-container"
    >
      <div 
        className="virtual-tree-content"
        style={{ height: totalHeight }}
      >
        {visibleNodes.map(node => (
          <TreeNode
            key={node.key}
            node={node}
            style={node.style}
            onToggleExpand={toggleExpand}
            onUpdateHeight={updateNodeHeight}
            onClick={onNodeClick}
            draggable={draggable}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            isDragging={dragState.dragNode?.key === node.key}
            isDropTarget={dragState.dropNode?.key === node.key}
            dropPosition={dragState.dropNode?.key === node.key ? dragState.dropPosition : null}
          />
        ))}
      </div>
    </div>
  );
});

export default VirtualTree;