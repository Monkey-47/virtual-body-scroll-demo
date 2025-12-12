import { useState, useRef } from 'react';
import { Card, Space, Typography, Button, message, Form, Input } from 'antd';
import { ReloadOutlined, PlusOutlined, ExpandOutlined, ShrinkOutlined, SaveOutlined } from '@ant-design/icons';
import VirtualTree from './components/VirtualTree';
import './App.css';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

// 生成测试数据
const generateTreeData = (level = 0, parentKey = '', count = 10) => {
  if (level > 3) return [];
  
  return Array.from({ length: count }, (_, index) => {
    const key = parentKey ? `${parentKey}-${index}` : `${index}`;
    const hasChildren = level < 3 && Math.random() > 0.3;
    
    return {
      key,
      title: `节点 ${key}`,
      extra: `Level ${level}`,
      children: hasChildren ? generateTreeData(level + 1, key, Math.floor(Math.random() * 8) + 3) : []
    };
  });
};

function App() {
  const [treeData, setTreeData] = useState(() => generateTreeData(0, '', 20));
  const [selectedNode, setSelectedNode] = useState(null);
  const [form] = Form.useForm();
  const treeRef = useRef(null);

  // 节点点击
  const handleNodeClick = (node) => {
    setSelectedNode(node);
    message.info(`点击了节点: ${node.title}`);
  };

  // 节点展开/收起
  const handleNodeExpand = (key, expanded) => {
    console.log(`节点 ${key} ${expanded ? '展开' : '收起'}`);
  };

  // 拖拽放置
  const handleDrop = ({ dragNode, dropNode, position }) => {
    // 深拷贝树数据
    const newTreeData = JSON.parse(JSON.stringify(treeData));
    
    // 辅助函数：从树中删除节点
    const removeNode = (nodes, targetKey) => {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].key === targetKey) {
          const removed = nodes.splice(i, 1)[0];
          return removed;
        }
        if (nodes[i].children && nodes[i].children.length > 0) {
          const removed = removeNode(nodes[i].children, targetKey);
          if (removed) return removed;
        }
      }
      return null;
    };
    
    // 辅助函数：在指定位置插入节点
    const insertNode = (nodes, targetKey, nodeToInsert, position) => {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].key === targetKey) {
          if (position === 'before') {
            nodes.splice(i, 0, nodeToInsert);
            return true;
          } else if (position === 'after') {
            nodes.splice(i + 1, 0, nodeToInsert);
            return true;
          } else if (position === 'inside') {
            if (!nodes[i].children) {
              nodes[i].children = [];
            }
            nodes[i].children.push(nodeToInsert);
            return true;
          }
        }
        if (nodes[i].children && nodes[i].children.length > 0) {
          const inserted = insertNode(nodes[i].children, targetKey, nodeToInsert, position);
          if (inserted) return true;
        }
      }
      return false;
    };
    
    // 检查是否拖拽到自己或自己的子节点
    const isDescendant = (parentKey, childKey) => {
      const checkNode = (nodes, targetKey) => {
        for (const node of nodes) {
          if (node.key === targetKey) return true;
          if (node.children && node.children.length > 0) {
            if (checkNode(node.children, targetKey)) return true;
          }
        }
        return false;
      };
      
      const findNode = (nodes, key) => {
        for (const node of nodes) {
          if (node.key === key) return node;
          if (node.children && node.children.length > 0) {
            const found = findNode(node.children, key);
            if (found) return found;
          }
        }
        return null;
      };
      
      const parentNode = findNode(newTreeData, parentKey);
      if (!parentNode || !parentNode.children) return false;
      return checkNode(parentNode.children, childKey);
    };
    
    // 不能拖到自己
    if (dragNode.key === dropNode.key) {
      message.warning('不能拖拽到自己');
      return;
    }
    
    // 不能拖到自己的子节点
    if (isDescendant(dragNode.key, dropNode.key)) {
      message.warning('不能拖拽到自己的子节点');
      return;
    }
    
    // 删除原节点
    const removedNode = removeNode(newTreeData, dragNode.key);
    if (!removedNode) {
      message.error('删除节点失败');
      return;
    }
    
    // 插入到新位置
    const inserted = insertNode(newTreeData, dropNode.key, removedNode, position);
    if (!inserted) {
      message.error('插入节点失败');
      return;
    }
    
    // 更新树数据
    setTreeData(newTreeData);
    
    message.success(
      `已将 "${dragNode.title}" 移动到 "${dropNode.title}" 的 ${
        position === 'before' ? '前面' : 
        position === 'after' ? '后面' : '内部'
      }`
    );
  };

  // 重新生成数据
  const handleRegenerate = () => {
    setTreeData(generateTreeData(0, '', 20));
    setSelectedNode(null);
    message.success('已重新生成树数据');
  };

  // 添加节点
  const handleAddNode = () => {
    const newNode = {
      key: `new-${Date.now()}`,
      title: `新节点 ${Date.now()}`,
      extra: 'New',
      children: []
    };
    setTreeData([...treeData, newNode]);
    message.success('已添加新节点');
  };

  // 全部展开
  const handleExpandAll = () => {
    if (treeRef.current) {
      treeRef.current.expandAll();
      message.success('已展开所有节点');
    }
  };

  // 全部收起
  const handleCollapseAll = () => {
    if (treeRef.current) {
      treeRef.current.collapseAll();
      message.success('已收起所有节点');
    }
  };

  // 保存场景用例
  const handleSave = () => {
    form.validateFields().then(values => {
      console.log('保存场景用例:', values);
      message.success('场景用例保存成功');
    }).catch(err => {
      console.error('表单验证失败:', err);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 标题区域 */}
        <div className="text-center mb-6">
          <Title level={2} className="!text-indigo-600 !mb-2">
            场景用例配置
          </Title>
          <Paragraph className="text-gray-600">
            配置场景用例信息并管理树形结构数据
          </Paragraph>
        </div>

        {/* 表单区域 */}
        <Card className="shadow-lg mb-6">
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              name: '',
              description: ''
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                label="场景用例名称"
                name="name"
                rules={[
                  { required: true, message: '请输入场景用例名称' },
                  { max: 100, message: '名称不能超过100个字符' }
                ]}
              >
                <Input 
                  placeholder="请输入场景用例名称" 
                  size="large"
                />
              </Form.Item>

              <Form.Item
                label="场景用例描述"
                name="description"
                rules={[
                  { max: 500, message: '描述不能超过500个字符' }
                ]}
              >
                <TextArea 
                  placeholder="请输入场景用例描述" 
                  rows={1}
                  size="large"
                />
              </Form.Item>
            </div>

            <Form.Item className="mb-0">
              <Space>
                <Button 
                  type="primary" 
                  icon={<SaveOutlined />}
                  onClick={handleSave}
                  size="large"
                >
                  保存场景用例
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        {/* 树组件操作栏 */}
        <div className="bg-white shadow-lg rounded-t-lg p-4 border-b">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Title level={5} className="!mb-0">树形结构数据</Title>
              {selectedNode && (
                <span className="text-sm text-gray-500">
                  已选中: {selectedNode.title}
                </span>
              )}
            </div>
            <Space wrap>
              <Button 
                icon={<ExpandOutlined />} 
                onClick={handleExpandAll}
              >
                全部展开
              </Button>
              <Button 
                icon={<ShrinkOutlined />} 
                onClick={handleCollapseAll}
              >
                全部收起
              </Button>
              <Button 
                icon={<PlusOutlined />} 
                onClick={handleAddNode}
                type="primary"
              >
                添加节点
              </Button>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={handleRegenerate}
              >
                重新生成
              </Button>
            </Space>
          </div>
        </div>

        {/* 树组件 - 使用body滚动条 */}
        <div className="bg-white shadow-lg rounded-b-lg border border-gray-200">
          <VirtualTree
            ref={treeRef}
            data={treeData}
            itemMinHeight={32}
            overscan={5}
            draggable={true}
            onNodeClick={handleNodeClick}
            onNodeExpand={handleNodeExpand}
            onDrop={handleDrop}
          />
        </div>

        {/* 页脚签名 */}
        <div className="text-center mt-8 pb-4">
          <p className="text-gray-500">
            由 <a href="https://with.woa.com/" style={{ color: '#8A2BE2' }} target="_blank" rel="noopener noreferrer">with</a> 通过自然语言生成
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;