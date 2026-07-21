# Seguridad avanzada en Kubernetes

## ClusterRole (alcance de cluster)

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: secret-reader
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get"]
  resourceNames: ["app-credentials"]  # Restrict to specific

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: admin-binding
subjects:
- kind: User
  name: admin@example.com
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: cluster-admin
  apiGroup: rbac.authorization.k8s.io
```

## Gestión de secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
stringData:
  username: admin
  password: secretpassword
```

### Montar como env
```yaml
env:
- name: DB_PASSWORD
  valueFrom:
    secretKeyRef:
      name: db-credentials
      key: password
```

### Montar como volumen
```yaml
volumeMounts:
- name: secret-volume
  mountPath: /etc/secrets
  readOnly: true
volumes:
- name: secret-volume
  secret:
    secretName: db-credentials
```

## Permitir DNS (requerido para la mayoría de apps)

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
spec:
  podSelector: {}
  policyTypes: [Egress]
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - { protocol: UDP, port: 53 }
```

## Checklist de seguridad

- [ ] RBAC con roles de mínimo privilegio
- [ ] Pod Security Standards (restricted)
- [ ] Network policies (denegación por defecto + allow explícito)
- [ ] Ejecutar contenedores como no root
- [ ] Sistema de archivos root de solo lectura
- [ ] Eliminar todas las capabilities
- [ ] Secrets para datos sensibles
- [ ] Escaneo de imágenes habilitado
- [ ] Registro de contenedores privado
- [ ] Cuotas y límites de recursos
- [ ] Audit logging habilitado
- [ ] Rotación regular de credenciales
