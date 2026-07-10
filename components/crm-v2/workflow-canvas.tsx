"use client";

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";

type WorkflowCanvasProps = {
  edges: Edge[];
  nodes: Node[];
  onConnect: (connection: Connection) => void;
  onEdgesChange: OnEdgesChange<Edge>;
  onNodeClick: (nodeId: string) => void;
  onNodesChange: OnNodesChange<Node>;
};

export function WorkflowCanvas({ edges, nodes, onConnect, onEdgesChange, onNodeClick, onNodesChange }: WorkflowCanvasProps) {
  return (
    <div className="h-[480px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <ReactFlow
        edges={edges}
        fitView
        nodes={nodes}
        nodesDraggable
        onConnect={onConnect}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => onNodeClick(node.id)}
        onNodesChange={onNodesChange}
      >
        <MiniMap pannable zoomable />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}
