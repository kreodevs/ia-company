import { useCallback, useEffect, useMemo, useState } from "react";
import type { Edge, Node } from "@xyflow/react";
import FlowEditor from "@/components/organisms/FlowEditor";
import { AUTO_COMPANY_FLOW_PRESET } from "@/presets/auto-company";
import type { Agent, Workflow } from "@/lib/api";
import {
  buildAgentDataSources,
  flowGraphToWorkflowSteps,
  workflowToFlowGraph,
} from "@/lib/workflow-flow-adapter";

interface WorkflowFlowEditorProps {
  workflow: Workflow;
  agents: Agent[];
  onSave: (steps: Workflow["steps"], edges: Workflow["edges"]) => void;
  saving?: boolean;
  readOnly?: boolean;
  showExecute?: boolean;
}

export default function WorkflowFlowEditor({
  workflow,
  agents,
  onSave,
  saving = false,
  readOnly = false,
  showExecute = false,
}: WorkflowFlowEditorProps) {
  const initial = useMemo(() => workflowToFlowGraph(workflow), [workflow]);
  const [nodes, setNodes] = useState<Node[]>(initial.nodes);
  const [edges, setEdges] = useState<Edge[]>(initial.edges);

  useEffect(() => {
    const next = workflowToFlowGraph(workflow);
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [workflow]);

  const dataSources = useMemo(() => buildAgentDataSources(agents), [agents]);

  const handleChange = useCallback((nextNodes: Node[], nextEdges: Edge[]) => {
    setNodes(nextNodes);
    setEdges(nextEdges);
  }, []);

  const handleSaveClick = useCallback(() => {
    const { steps, edges: edgePayload } = flowGraphToWorkflowSteps(
      nodes,
      edges,
      workflow.steps,
      agents,
    );
    onSave(steps, edgePayload);
  }, [agents, edges, nodes, onSave, workflow.steps]);

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={saving}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar flujo"}
          </button>
        </div>
      )}

      <FlowEditor
        nodes={nodes}
        edges={edges}
        onChange={handleChange}
        preset={AUTO_COMPANY_FLOW_PRESET}
        dataSources={dataSources}
        triggerType="on_manual_run"
        readOnly={readOnly}
        height="min(520px, 62vh)"
        paletteVariant="floating"
        showExecutionTrace={showExecute}
        onExecuteWorkflow={
          showExecute
            ? async () => {
                /* dry-run trace only in editor — real execute stays on WorkflowEditorPage */
              }
            : undefined
        }
      />
    </div>
  );
}
