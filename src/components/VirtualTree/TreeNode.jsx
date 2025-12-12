import { useRef, useEffect } from 'react';
import { DownOutlined, RightOutlined, FileOutlined, FolderOutlined, FolderOpenOutlined } from '@ant-design/icons';

const TreeNode = ({
  node,
  style,
  onToggleExpand,
  onUpdateHeight,
  onClick,
  draggable,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  isDragging,
  isDropTarget,
  dropPosition
}) => {
  const nodeRef = useRef(null);

  // 测量节点高度
  useEffect(() => {
    if (nodeRef.current) {
      const height = nodeRef.current.offsetHeight;
      onUpdateHeight(node.key, height);
    }
  }, [node.key, node.title, onUpdateHeight]);

  // 使用 ResizeObserver 监听高度变化
  useEffect(() => {
    if (!nodeRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        onUpdateHeight(node.key, height);
      }
    });

    resizeObserver.observe(nodeRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [node.key, onUpdateHeight]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick(node);
    }
  };

  const handleExpandClick = (e) => {
    e.stopPropagation();
    if (node.hasChildren) {
      onToggleExpand(node.key);
    }
  };

  const handleDragStart = (e) => {
    if (draggable && onDragStart) {
      onDragStart(e, node);
    }
  };

  const handleDragOver = (e) => {
    if (!draggable || !onDragOver) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = nodeRef.current.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const height = rect.height;
    
    let position;
    if (offsetY < height * 0.25) {
      position = 'before';
    } else if (offsetY > height * 0.75) {
      position = 'after';
    } else {
      position = 'inside';
    }
    
    onDragOver(e, node, position);
  };

  const handleDragLeave = (e) => {
    e.stopPropagation();
    if (draggable && onDragLeave) {
      onDragLeave(e, node);
    }
  };

  const handleDrop = (e) => {
    e.stopPropagation();
    if (draggable && onDrop && dropPosition) {
      onDrop(e, node, dropPosition);
    }
  };

  const handleDragEnd = (e) => {
    e.stopPropagation();
    if (draggable && onDragEnd) {
      onDragEnd(e, node);
    }
  };

  const renderIcon = () => {
    if (node.icon) {
      return <span className="tree-node-icon">{node.icon}</span>;
    }
    
    if (node.hasChildren) {
      return node.isExpanded ? 
        <FolderOpenOutlined className="tree-node-icon" /> : 
        <FolderOutlined className="tree-node-icon" />;
    }
    
    return <FileOutlined className="tree-node-icon" />;
  };

  const renderExpandIcon = () => {
    if (!node.hasChildren) {
      return <span className="tree-node-expand-placeholder" />;
    }
    
    return (
      <span 
        className="tree-node-expand-icon"
        onClick={handleExpandClick}
      >
        {node.isExpanded ? <DownOutlined /> : <RightOutlined />}
      </span>
    );
  };

  const getDropIndicatorClass = () => {
    if (!isDropTarget || !dropPosition) return '';
    return `drop-indicator-${dropPosition}`;
  };

  return (
    <div
      ref={nodeRef}
      className={`
        tree-node
        ${isDragging ? 'dragging' : ''}
        ${isDropTarget ? 'drop-target' : ''}
        ${getDropIndicatorClass()}
      `}
      style={{
        ...style,
        paddingLeft: `${node.level * 24 + 8}px`,
        minHeight: node.isExpanded ? '50px' : '32px'
      }}
      onClick={handleClick}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
    >
      <div className="tree-node-content">
        {renderExpandIcon()}
        {renderIcon()}
        <span className="tree-node-title">{node.title}</span>
        {node.extra && <span className="tree-node-extra">{node.extra}</span>}
      </div>
    </div>
  );
};

export default TreeNode;