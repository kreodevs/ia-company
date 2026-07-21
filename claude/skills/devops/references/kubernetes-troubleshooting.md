# Solución de problemas en Kubernetes

## Flujo de depuración

```bash
# 1. Overview
kubectl get pods -o wide
kubectl get events -n <namespace> --sort-by='.lastTimestamp'

# 2. Details
kubectl describe pod <pod-name>

# 3. Logs
kubectl logs <pod-name>
kubectl logs <pod-name> --previous  # Crashed instance
kubectl logs <pod-name> -c <container>
```

## Estados comunes de pods

| Estado | Causa | Solución |
|-------|-------|----------|
| Pending | No node resources | Check node capacity |
| ContainerCreating | Image pulling | Check image URI |
| CrashLoopBackOff | Container exits | Check logs, health checks |
| ImagePullBackOff | Failed image pull | Verify credentials |
| OOMKilled (137) | Out of memory | Increase memory limit |

## Servicio y red

```bash
kubectl exec -it <pod-name> -- nslookup kubernetes.default
kubectl exec -it <pod-name> -- curl http://myservice:8080
kubectl get endpoints <service-name>
kubectl port-forward service/myservice 8080:8080
kubectl get networkpolicies -A
```

## Correcciones rápidas

| Problema | Comando |
|---------|---------|
| Pod stuck | `kubectl delete pod <name> --grace-period=0 --force` |
| High CPU | `kubectl top pods -A --sort-by=cpu` |
| High memory | `kubectl top pods -A --sort-by=memory` |
| Restart | `kubectl rollout restart deployment/<name>` |
| Rollback | `kubectl rollout undo deployment/<name>` |

Consulta `kubernetes-troubleshooting-advanced.md` para problemas de nodos, HPA y anti-patrones.
