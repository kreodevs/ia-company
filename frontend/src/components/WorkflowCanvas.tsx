import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeContext";
import type { Agent, Workflow, WorkflowStep } from "../lib/api";

type AgentNodeData = {
  label: string;
  agentName: string;
  stepId: string;
  agentId: string;
};

function AgentNode({ data, selected }: NodeProps<Node<AgentNodeData>>) {
  const { t } = useTranslation();

  return (
    <div className={`react-flow__node-agent ${selected ? "selected" : ""}`}>
      <Handle type="target" position={Position.Top} className="!bg-[var(--color-primary)]" />
      <div className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {t("nav.agents")}
      </div>
      <div className="font-semibold">{data.agentName}</div>
      {data.label && data.label !== data.agentName && (
        <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">{data.label}</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-[var(--color-accent)]" />
    </div>
  );
}

const nodeTypes = { agent: AgentNode };

interface WorkflowCanvasProps {
  workflow: Workflow;
  agents: Agent[];
  onSave: (steps: WorkflowStep[], edges: Workflow["edges"]) => void;
  saving?: boolean;
}

export default function WorkflowCanvas({ workflow, agents, onSave, saving }: WorkflowCanvasProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const flowColorMode = theme === "letter" ? "light" : "dark";
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const initialNodes: Node<AgentNodeData>[] = useMemo(
    () =>
      workflow.steps.map((step) => ({
        id: step.id,
        type: "agent",
        position: { x: step.positionX, y: step.positionY },
        data: {
          label: step.label ?? step.agent.name,
          agentName: step.agent.name,
          stepId: step.id,
          agentId: step.agentId,
        },
      })),
    [workflow.steps],
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      workflow.edges.map((e) => ({
        id: e.id,
        source: e.sourceStepId,
        target: e.targetStepId,
        animated: true,
        style: { stroke: "var(--flow-edge-color, var(--color-primary))" },
      })),
    [workflow.edges],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setSelectedNodeId(null);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, animated: true }, eds)),
    [setEdges],
  );

  const handleSave = useCallback(() => {
    const steps: WorkflowStep[] = nodes.map((node, index) => {
      const existing = workflow.steps.find((s) => s.id === node.id);
      return {
        id: node.id,
        agentId: node.data.agentId,
        stepOrder: index,
        label: node.data.label,
        positionX: node.position.x,
        positionY: node.position.y,
        inputConfig: existing?.inputConfig ?? { passSharedMemory: true },
        outputConfig: existing?.outputConfig ?? { appendToSharedMemory: true },
        agent: existing?.agent ?? agents.find((a) => a.id === node.data.agentId)!,
      };
    });

    const edgePayload = edges.map((e) => ({
      id: e.id.startsWith("reactflow") ? undefined : e.id,
      sourceStepId: e.source,
      targetStepId: e.target,
    })) as Workflow["edges"];

    onSave(steps, edgePayload);
  }, [nodes, edges, workflow.steps, agents, onSave]);

  const addAgentNode = useCallback(
    (agentId: string) => {
      const agent = agents.find((a) => a.id === agentId);
      if (!agent) return;
      const id = `temp-${crypto.randomUUID()}`;
      setNodes((nds) => [
        ...nds,
        {
          id,
          type: "agent",
          position: { x: 250, y: nds.length * 150 + 50 },
          data: {
            label: agent.name,
            agentName: agent.name,
            stepId: id,
            agentId: agent.id,
          },
        },
      ]);
    },
    [agents, setNodes],
  );

  const deleteSelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.filter((node) => node.id !== selectedNodeId));
    setEdges((eds) =>
      eds.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId),
    );
    setSelectedNodeId(null);
  }, [selectedNodeId, setNodes, setEdges]);

  const updateSelectedAgent = useCallback(
    (agentId: string) => {
      const agent = agents.find((a) => a.id === agentId);
      if (!agent || !selectedNodeId) return;
      setNodes((nds) =>
        nds.map((node) =>
          node.id === selectedNodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  agentId: agent.id,
                  agentName: agent.name,
                  label: node.data.label === node.data.agentName ? agent.name : node.data.label,
                },
              }
            : node,
        ),
      );
    },
    [agents, selectedNodeId, setNodes],
  );

  const updateSelectedLabel = useCallback(
    (label: string) => {
      if (!selectedNodeId) return;
      setNodes((nds) =>
        nds.map((node) =>
          node.id === selectedNodeId ? { ...node, data: { ...node.data, label } } : node,
        ),
      );
    },
    [selectedNodeId, setNodes],
  );

  return (
    <div className="workflow-canvas-shell h-[min(420px,55vh)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--flow-canvas-bg,var(--color-background))] sm:h-[500px] lg:h-[600px]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={({ nodes: selectedNodes }) => {
          setSelectedNodeId(selectedNodes.length === 1 ? selectedNodes[0]!.id : null);
        }}
        nodeTypes={nodeTypes}
        nodesDraggable
        nodesConnectable
        elementsSelectable
        deleteKeyCode={["Backspace", "Delete"]}
        fitView
        colorMode={flowColorMode}
      >
        <Panel
          position="top-left"
          className="flex max-w-[calc(100%-1rem)] flex-wrap items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]/95 p-2 shadow-sm backdrop-blur-sm"
        >
          <select
            className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm sm:min-w-[220px] sm:flex-none"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                addAgentNode(e.target.value);
                e.target.value = "";
              }
            }}
          >
            <option value="">{t("workflows.canvas.addAgentNode")}</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
          >
            {saving ? t("common.saving") : t("workflows.canvas.saveWorkflow")}
          </button>
        </Panel>

        {selectedNode && (
          <Panel
            position="top-right"
            className="w-[min(100%,18rem)] space-y-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]/95 p-3 shadow-sm backdrop-blur-sm"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
              {t("workflows.canvas.editNode")}
            </div>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">{t("workflows.canvas.nodeAgent")}</span>
              <select
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                value={selectedNode.data.agentId}
                onChange={(e) => updateSelectedAgent(e.target.value)}
              >
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">{t("workflows.canvas.nodeLabel")}</span>
              <input
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                value={selectedNode.data.label}
                onChange={(e) => updateSelectedLabel(e.target.value)}
              />
            </label>
            <button
              type="button"
              onClick={deleteSelectedNode}
              className="w-full rounded-lg border border-[var(--color-destructive)] px-3 py-2 text-sm font-medium text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10"
            >
              {t("workflows.canvas.deleteNode")}
            </button>
            <p className="text-xs text-[var(--color-muted-foreground)]">{t("workflows.canvas.editHint")}</p>
          </Panel>
        )}

        <Background gap={20} color="var(--flow-grid-color, var(--color-border))" />
        <Controls className="!bottom-2 !left-2 sm:!bottom-4 sm:!left-4" />
        <MiniMap
          className="!hidden sm:!block"
          nodeColor="var(--flow-minimap-node, var(--color-primary))"
          maskColor="var(--flow-minimap-mask, rgb(0 0 0 / 0.6))"
        />
      </ReactFlow>
    </div>
  );
}
