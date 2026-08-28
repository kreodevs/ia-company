import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

export interface DashboardKPIProps {
    /** Título del indicador */
    title: string;
    /** Valor principal (ej: "$45,231.89") */
    value: string;
    /** Diferencia porcentual (ej: "+2.5") */
    trend?: number;
    /** Descripción del periodo (ej: "vs mes anterior") */
    trendLabel?: string;
    /** Icono representativo */
    icon?: React.ElementType;
    /** Datos para el sparkline (ej: [20, 45, 28, 80, 99]) */
    chartData?: { value: number }[];
    /** Variante de color: 'default', 'success', 'warning', 'destructive', 'primary' */
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
    /** Clases adicionales */
    className?: string;
    /** Ocultar el encabezado interno (para uso en contenedores con su propio título) */
    hideHeader?: boolean;
    /** Invierte los colores de la tendencia (útil para métricas negativas como Churn o Errores) */
    reverseTrend?: boolean;
    /** Icono personalizado para tendencia positiva */
    trendIcon?: React.ElementType;
    /** Icono personalizado para tendencia negativa */
    trendDownIcon?: React.ElementType;
    /** Estado de carga: muestra un skeleton matching el layout de la KPI */
    loading?: boolean;
}

/**
 * DashboardKPI - Tarjeta de indicador clave con diseño Premium.
 * Incluye soporte para sparklines, tendencias y variantes de estado.
 */
export const DashboardKPI = forwardRef<HTMLDivElement, DashboardKPIProps>(({
    title,
    value,
    trend,
    trendLabel,
    icon: Icon,
    chartData,
    variant = 'default',
    className,
    hideHeader = false,
    reverseTrend = false,
    trendIcon: CustomTrendUp,
    trendDownIcon: CustomTrendDown,
    loading = false
}, ref) => {
    const isPositiveValue = trend && trend > 0;
    const isGoodTrend = reverseTrend ? !isPositiveValue : isPositiveValue;

    const variantStyles = {
        default: "border-[var(--border)]",
        primary: "border-[var(--primary)]/30",
        success: "border-[var(--success)]/30",
        warning: "border-[var(--warning)]/30",
        destructive: "border-[var(--destructive)]/30",
    };

    const iconStyles = {
        default: "text-[var(--foreground-muted)] bg-[var(--secondary)]/10",
        primary: "text-[var(--primary)] bg-[var(--primary)]/10",
        success: "text-[var(--success)] bg-[var(--success)]/10",
        warning: "text-[var(--warning)] bg-[var(--warning)]/10",
        destructive: "text-[var(--destructive)] bg-[var(--destructive)]/10",
    };

    const trendStyles = isGoodTrend
        ? "text-[var(--success)] bg-[var(--success)]/10"
        : "text-[var(--destructive)] bg-[var(--destructive)]/10";

    const TrendUpIcon = CustomTrendUp || TrendingUp;
    const TrendDownIcon = CustomTrendDown || TrendingDown;

    if (loading) {
        return (
            <div
                ref={ref}
                className={cn(
                    "relative overflow-hidden p-[var(--spacing-lg)] rounded-[var(--radius-2xl)] bg-[var(--card)] border shadow-sm",
                    variantStyles[variant],
                    className
                )}
            >
                <div className="relative z-[1] animate-pulse">
                    {!hideHeader && (
                        <header className="flex items-center justify-between mb-[var(--spacing-md)]">
                            <div className="h-5 w-20 rounded bg-[var(--secondary)]" />
                            {Icon && (
                                <div className="h-8 w-8 rounded-xl bg-[var(--secondary)]" />
                            )}
                        </header>
                    )}

                    <div className="flex flex-col gap-[var(--spacing-sm)]">
                        <div className="h-10 w-32 rounded-lg bg-[var(--secondary)]" />
                        <div className="h-6 w-16 rounded-md bg-[var(--secondary)]" />
                    </div>

                    {chartData && (
                        <div className="mt-[var(--spacing-xl)] h-16 w-full rounded-lg bg-[var(--secondary)]" />
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            ref={ref}
            className={cn(
                "relative overflow-hidden p-[var(--spacing-lg)] rounded-[var(--radius-2xl)] bg-[var(--card)] border shadow-sm group transition-all duration-300 hover:shadow-lg hover:translate-y-[-2px]",
                variantStyles[variant],
                className
            )}
        >
            {/* Glow Effects */}
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-[var(--primary)]/5 blur-[40px] rounded-full pointer-events-none transition-opacity group-hover:opacity-100" />

            <div className="relative z-[1]">
                {!hideHeader && (
                    <header className="flex items-center justify-between mb-[var(--spacing-md)]">
                        <span className="text-[10px] font-black text-[var(--foreground-subtle)] uppercase tracking-[0.2em]">{title}</span>
                        {Icon && (
                            <div className={cn("p-[var(--spacing-sm)] rounded-xl transition-colors", iconStyles[variant])}>
                                <Icon className="w-5 h-5" />
                            </div>
                        )}
                    </header>
                )}

                <div className="flex flex-col gap-[var(--spacing-sm)]">
                    <h3 className="text-3xl font-black text-[var(--foreground)] tracking-tight">{value}</h3>

                    {trend !== undefined && (
                        <div className="flex items-center gap-[var(--spacing-sm)]">
                            <div className={cn("inline-flex items-center gap-[var(--spacing-xs)] px-[var(--spacing-xs)] py-[var(--spacing-xxs)] rounded-md text-[10px] font-black", trendStyles)}>
                                {isPositiveValue ? <TrendUpIcon className="w-3 h-3" /> : <TrendDownIcon className="w-3 h-3" />}
                                {isPositiveValue ? "+" : ""}{trend}%
                            </div>
                            {trendLabel && (
                                <span className="text-[10px] font-bold text-[var(--foreground-muted)] uppercase tracking-wider">{trendLabel}</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Sparkline Integration */}
                {chartData && (
                    <div className="mt-[var(--spacing-xl)] h-16 w-full opacity-60 group-hover:opacity-100 transition-opacity">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id={`colorValue-${title}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="var(--primary)"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill={`url(#colorValue-${title})`}
                                    animationDuration={2000}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
});

DashboardKPI.displayName = 'DashboardKPI';
