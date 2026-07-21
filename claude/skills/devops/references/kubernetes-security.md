# Seguridad en Kubernetes

## RBAC (control de acceso basado en roles)

### Role (alcance de namespace)
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: pod-reader
rules:
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "list", "watch"]
```

### RoleBinding
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: default
subjects:
- kind: ServiceAccount
  name: my-app-sa
  namespace: default
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

### Verificar permisos
```bash
kubectl auth can-i get pods --as=system:serviceaccount:default:my-sa
kubectl get roles,rolebindings -n default
```

## Seguridad de pods (Restricted)

```yaml
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop: ["ALL"]
```

Habilitar en namespace:
```bash
kubectl label namespace default \
  pod-security.kubernetes.io/enforce=restricted
```

## Políticas de red

### Denegación por defecto
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
```

### Permitir específico
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
spec:
  podSelector:
    matchLabels: { app: backend }
  ingress:
  - from:
    - podSelector:
        matchLabels: { app: frontend }
    ports:
    - { protocol: TCP, port: 8080 }
```

Consulta `kubernetes-security-advanced.md` para secrets, ClusterRoles y checklist.
