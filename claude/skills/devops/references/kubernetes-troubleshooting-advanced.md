# Solución de problemas avanzada en Kubernetes

## Problemas de nodos
```bash
kubectl describe node <node-name> | grep -A 5 "Conditions:"
kubectl top node <node-name>
kubectl top pods -A --sort-by=memory
kubectl drain <node-name> --ignore-daemonsets
kubectl uncordon <node-name>
```

## CrashLoopBackOff
```bash
kubectl logs <pod-name> --previous
kubectl describe pod <pod-name>
kubectl get pod <pod-name> -o yaml | grep -A 5 resources:
```

## HPA
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Anti-patrones

**Usar tag `latest`:**
```yaml
# ❌ image: myapp:latest
# ✅ image: myapp:v1.2.3
```

**Recursos faltantes:**
```yaml
# ✅ Always set
resources:
  requests: { memory: "256Mi", cpu: "250m" }
  limits: { memory: "512Mi", cpu: "500m" }
```

**Health checks faltantes:**
```yaml
livenessProbe:
  httpGet: { path: /health, port: 8080 }
readinessProbe:
  httpGet: { path: /ready, port: 8080 }
```

**Ejecutar como root:**
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
```

## Monitoreo
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring
```
