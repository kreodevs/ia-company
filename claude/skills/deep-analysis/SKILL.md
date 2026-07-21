---
name: deep-analysis
description: Patrones de pensamiento analítico para evaluaciones integrales, auditorías de código, análisis de seguridad y revisiones de desempeño. Proporciona plantillas estructuradas para una investigación exhaustiva con apoyo de pensamiento ampliado.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Task
  - WebFetch
  - WebSearch
dependencies:
  - extended-thinking
  - complex-reasoning
triggers:
  - analyze
  - audit
  - review
  - assess
  - evaluate
  - investigate
  - deep dive
  - comprehensive review
  - security analysis
  - performance analysis
  - code audit
---
# Habilidad de análisis profundo

Plantillas analíticas integrales para investigaciones, auditorías y evaluaciones exhaustivas que aprovechan las capacidades de pensamiento ampliadas.

## Cuándo utilizar

- **Auditorías de código** que requieren revisión sistemática
- **Evaluaciones de seguridad** y modelado de amenazas
- **Análisis de rendimiento** y planificación de optimización
- **Revisiones de arquitectura** y evaluación de deuda técnica
- **Autopsias de incidentes** y análisis de causa raíz
- **Auditorías de cumplimiento** y evaluaciones de riesgos

## Plantillas de análisis

### Plantilla de auditoría de código

```markdown
## Informe de auditoría de código

**Repository**: [repo-name]
**Scope**: [files/modules audited]
**Date**: [YYYY-MM-DD]
**Auditor**: Claude + [Human reviewer]

### Resumen ejecutivo
[2-3 sentence overview of findings]

### Criterios de auditoría
- [ ] Code quality and maintainability
- [ ] Security vulnerabilities
- [ ] Performance concerns
- [ ] Test coverage
- [ ] Documentation completeness
- [ ] Dependency health

### Hallazgos críticos
| ID | Severity | Location | Issue | Recommendation |
|----|----------|----------|-------|----------------|
| C1 | Critical | file:line | [Issue] | [Fix] |
| C2 | Critical | file:line | [Issue] | [Fix] |

### Hallazgos de alta prioridad
| ID | Severity | Location | Issue | Recommendation |
|----|----------|----------|-------|----------------|
| H1 | High | file:line | [Issue] | [Fix] |

### Hallazgos de prioridad media
[...]

### Low Priority / Suggestions
[...]

### Métricas
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Test Coverage | 75% | 80% | ⚠️ |
| Cyclomatic Complexity | 12 | <10 | ⚠️ |
| Technical Debt | 4.2d | <3d | ❌ |
| Security Score | 8/10 | 9/10 | ⚠️ |

### Recomendaciones
1. **Immediate**: [Critical fixes]
2. **Short-term**: [Within sprint]
3. **Long-term**: [Tech debt reduction]

### Sign-off
- [ ] All critical issues addressed
- [ ] High priority issues have timeline
- [ ] Audit findings documented in backlog
```

### Plantilla de modelo de amenazas a la seguridad

```markdown
## Threat Model: [System/Component Name]

**Version**: [1.0]
**Last Updated**: [YYYY-MM-DD]
**Classification**: [Internal/Confidential]

### Visión general del sistema
[Brief description of the system being modeled]

### Activos
| Asset | Description | Sensitivity | Owner |
|-------|-------------|-------------|-------|
| User Data | PII, credentials | Critical | Auth Team |
| API Keys | Service credentials | High | DevOps |
| Business Data | Transactions | High | Product |

### Límites de confianza
```┌──────────────────── ─────────────────────┐
│ Externo (no confiable) │
│ [Usuarios de Internet] [API de terceros] │
└──────────────────┬─ ─────────────────────┘
                   │ WAF/equilibrador de carga
┌──────────────────┴─ ─────────────────────┐
│ DMZ (Semiconfiable) │
│ [Puerta de enlace API] [CDN] [Servicios públicos] │
└──────────────────┬─ ─────────────────────┘
                   │ Cortafuegos interno
┌──────────────────┴─ ─────────────────────┐
│ Interno (Confiable) │
│ [Servidores de aplicaciones] [Bases de datos] [Colas] │
└──────────────────── ─────────────────────┘```

### Threat Categories (STRIDE)

#### Spoofing
| Threat | Likelihood | Impact | Mitigation |
|--------|------------|--------|------------|
| Credential theft | Medium | High | MFA, rate limiting |
| Session hijacking | Low | High | Secure cookies, HTTPS |

#### Tampering
| Threat | Likelihood | Impact | Mitigation |
|--------|------------|--------|------------|
| SQL injection | Medium | Critical | Parameterized queries |
| Data modification | Low | High | Integrity checks |

#### Repudiation
[...]

#### Information Disclosure
[...]

#### Denial of Service
[...]

#### Elevation of Privilege
[...]

### Vectores de ataque
1. **Vector 1**: [Description]
   - Entry point: [Where]
   - Technique: [How]
   - Mitigation: [Defense]

### Matriz de riesgos
| Threat | Likelihood | Impact | Risk Score | Priority |
|--------|------------|--------|------------|----------|
| T1     | High       | Critical | 9 | P1 |
| T2     | Medium     | High | 6 | P2 |
| T3     | Low        | Medium | 3 | P3 |

### Controles de seguridad
| Control | Type | Status | Coverage |
|---------|------|--------|----------|
| WAF | Preventive | ✅ Active | External |
| SAST | Detective | ✅ CI/CD | Code |
| DAST | Detective | ⚠️ Partial | Runtime |
| Encryption | Preventive | ✅ Active | Data |

### Recomendaciones
1. [Priority 1 recommendations]
2. [Priority 2 recommendations]
3. [Priority 3 recommendations]
```

### Plantilla de análisis de rendimiento

```markdown
## Informe de análisis de rendimiento

**System**: [System name]
**Period**: [Date range]
**Environment**: [Production/Staging]

### Resumen ejecutivo
[Key findings and recommendations]

### Métricas de rendimiento

#### Response Times
| Endpoint | P50 | P95 | P99 | Target | Status |
|----------|-----|-----|-----|--------|--------|
| /api/users | 45ms | 120ms | 350ms | <200ms | ✅ |
| /api/search | 230ms | 890ms | 2.1s | <500ms | ❌ |
| /api/reports | 1.2s | 3.4s | 8.2s | <2s | ❌ |

#### Throughput
| Service | Current RPS | Peak RPS | Capacity | Utilization |
|---------|-------------|----------|----------|-------------|
| API | 1,200 | 2,400 | 5,000 | 48% |
| Worker | 500 | 800 | 1,000 | 80% |

#### Resource Utilization
| Resource | Average | Peak | Threshold | Status |
|----------|---------|------|-----------|--------|
| CPU | 45% | 78% | 80% | ⚠️ |
| Memory | 62% | 85% | 85% | ⚠️ |
| Disk I/O | 30% | 55% | 70% | ✅ |
| Network | 25% | 40% | 60% | ✅ |

### Análisis de cuellos de botella

#### Identified Bottlenecks
1. **Database Queries** (High Impact)
   - Location: `/api/search` endpoint
   - Cause: Missing index on `created_at` column
   - Impact: 890ms P95 latency
   - Fix: Add composite index

2. **Memory Pressure** (Medium Impact)
   - Location: Report generation service
   - Cause: Large dataset loading into memory
   - Impact: GC pauses, OOM risks
   - Fix: Implement streaming/pagination

### Resultados de pruebas de carga
| Scenario | Users | Duration | Errors | Avg Response |
|----------|-------|----------|--------|--------------|
| Baseline | 100 | 10min | 0% | 120ms |
| Normal | 500 | 30min | 0.1% | 180ms |
| Peak | 1000 | 15min | 2.3% | 450ms |
| Stress | 2000 | 5min | 15% | 2.1s |

### Recomendaciones de optimización

#### Quick Wins (This Sprint)
1. Add database indexes - Expected: 40% improvement
2. Enable query caching - Expected: 25% improvement
3. Optimize N+1 queries - Expected: 30% improvement

#### Medium Term (Next Quarter)
1. Implement read replicas
2. Add CDN for static assets
3. Optimize serialization

#### Long Term (6+ Months)
1. Service decomposition
2. Event-driven architecture
3. Edge computing deployment

### Planificación de capacidad
| Timeframe | Expected Load | Current Capacity | Gap | Action |
|-----------|---------------|------------------|-----|--------|
| 3 months | +25% | 5,000 RPS | ✅ | Monitor |
| 6 months | +50% | 5,000 RPS | ⚠️ | Scale |
| 12 months | +100% | 5,000 RPS | ❌ | Redesign |
```

### Plantilla de revisión de arquitectura

```markdown
## Revisión de arquitectura

**System**: [System name]
**Version**: [Current architecture version]
**Review Date**: [YYYY-MM-DD]
**Participants**: [Team members]

### Arquitectura actual

#### System Diagram
```[Incluir diagrama de arquitectura o representación ASCII]```

#### Components
| Component | Purpose | Technology | Owner |
|-----------|---------|------------|-------|
| API Gateway | Request routing | Kong | Platform |
| Auth Service | Authentication | Keycloak | Security |
| Core API | Business logic | Python/FastAPI | Backend |
| Database | Data persistence | PostgreSQL | Data |

#### Data Flow
1. User request → API Gateway
2. API Gateway → Auth validation
3. Auth → Core API
4. Core API → Database
5. Response → User

### Criterios de evaluación

#### Scalability
| Aspect | Current | Target | Gap | Score |
|--------|---------|--------|-----|-------|
| Horizontal scaling | Manual | Auto | Yes | 6/10 |
| Database scaling | Single | Sharded | Yes | 5/10 |
| Caching | Redis | Distributed | No | 8/10 |

#### Reliability
| Aspect | Current | Target | Gap | Score |
|--------|---------|--------|-----|-------|
| Availability | 99.5% | 99.9% | Yes | 7/10 |
| Disaster recovery | Manual | Auto | Yes | 5/10 |
| Data backup | Daily | Real-time | Yes | 6/10 |

#### Maintainability
| Aspect | Current | Target | Gap | Score |
|--------|---------|--------|-----|-------|
| Code modularity | Medium | High | Yes | 6/10 |
| Documentation | Partial | Complete | Yes | 5/10 |
| Test coverage | 70% | 85% | Yes | 7/10 |

### Evaluación de deuda técnica
| Item | Impact | Effort | Priority | Age |
|------|--------|--------|----------|-----|
| Legacy auth system | High | High | P1 | 2y |
| Monolithic API | Medium | High | P2 | 1.5y |
| Missing monitoring | Medium | Low | P1 | 1y |

### Recomendaciones

#### Immediate (0-3 months)
1. [Recommendation 1]
2. [Recommendation 2]

#### Short-term (3-6 months)
1. [Recommendation 1]
2. [Recommendation 2]

#### Long-term (6-12 months)
1. [Recommendation 1]
2. [Recommendation 2]

### Registro de decisiones
| Decision | Rationale | Alternatives Considered | Date |
|----------|-----------|------------------------|------|
| [Decision 1] | [Why] | [Options] | [Date] |
```

## Integración con pensamiento extendido

Para tareas de análisis profundo, utilice el presupuesto máximo de pensamiento:

```python
response = client.messages.create(
    model="claude-opus-4-5-20250514",
    max_tokens=32000,
    thinking={
        "type": "enabled",
        "budget_tokens": 25000  # Maximum budget for deep analysis
    },
    system="""You are a senior technical analyst performing a
    comprehensive review. Use structured analysis templates and
    document all findings systematically.""",
    messages=[{
        "role": "user",
        "content": "Perform a security threat model for..."
    }]
)
```

## Mejores prácticas

1. **Utilice plantillas adecuadas**: haga coincidir la plantilla con el tipo de análisis
2. **Sea sistemático**: siga completamente la estructura de la plantilla
3. **Cuantificar los hallazgos**: utilizar métricas y clasificaciones de gravedad
4. **Priorizar lo procesable**: centrarse en los hallazgos que se pueden solucionar
5. **Evidencia documental**: enlace a códigos/registros/datos específicos
6. **Seguimiento del progreso**: actualice los hallazgos a medida que se abordan

## Ver también

- [[pensamiento extendido]] - Habilita capacidades de razonamiento profundo
- [[razonamiento-complejo]] - Marcos de razonamiento
- [[testing]] - Estrategias de validación
- [[depuración]] - Investigación de problemas