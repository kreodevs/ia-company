# Patrones de flujo de trabajo

## Flujos de trabajo secuenciales

Para tareas complejas, divida las operaciones en pasos claros y secuenciales. A menudo resulta útil brindarle a Claude una descripción general del proceso hacia el comienzo de SKILL.md:

```markdown
Filling a PDF form involves these steps:

1. Analyze the form (run analyze_form.py)
2. Create field mapping (edit fields.json)
3. Validate mapping (run validate_fields.py)
4. Fill the form (run fill_form.py)
5. Verify output (run verify_output.py)
```

## Flujos de trabajo condicionales

Para tareas con lógica de ramificación, guíe a Claude a través de los puntos de decisión:

```markdown
1. Determine the modification type:
   **Creating new content?** → Follow "Creation workflow" below
   **Editing existing content?** → Follow "Editing workflow" below

2. Creation workflow: [steps]
3. Editing workflow: [steps]
```