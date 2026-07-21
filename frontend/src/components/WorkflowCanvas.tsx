import {
  Background,
  Controls,
  Handle,
  MiniMap,
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
import { useCallback, useEffect, useMemo } from "react";
import type { Agent, Workflow, WorkflowStep } from "../lib/api";

type AgentNodeData = {
  label: string;
  agentName: string;
  stepId: string;
  agentId: string;
};

function AgentNode({ data, selected }: NodeProps<Node<AgentNodeData>>) {
  return (
    <div className={`react-flow__node-agent ${selected ? "selected" : ""}`}>
      <Handle type="target" position={Position.Top} className="!bg-[var(--color-primary)]" />
      <div className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">Agent</div>
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
        style: { stroke: "var(--color-primary)" },
      })),
    [workflow.edges],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) {
              addAgentNode(e.target.value);
              e.target.value = "";
            }
          }}
        >
          <option value="">+ Add agent node…</option>
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
          {saving ? "Saving…" : "Save workflow"}
        </button>
      </div>

      <div className="h-[min(420px,55vh)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] sm:h-[500px] lg:h-[600px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          colorMode="dark"
        >
          <Background gap={20} color="var(--color-border)" />
          <Controls className="!bottom-2 !left-2 sm:!bottom-4 sm:!left-4" />
          <MiniMap
            className="!hidden sm:!block"
            nodeColor="var(--color-primary)"
            maskColor="rgb(0 0 0 / 0.6)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
