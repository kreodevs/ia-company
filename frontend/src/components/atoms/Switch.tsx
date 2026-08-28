import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

export interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
    checkedColor?: string;
    uncheckedColor?: string;
    thumbColor?: string;
    activeThumbColor?: string;
}

const Switch = React.forwardRef<
    React.ElementRef<typeof SwitchPrimitives.Root>,
    SwitchProps
>(({ className, checkedColor, uncheckedColor, thumbColor, activeThumbColor, style, ...props }, ref) => {
    const customStyles = {
        ...(checkedColor ? { '--switch-checked': checkedColor } : {}),
        ...(uncheckedColor ? { '--switch-unchecked': uncheckedColor } : {}),
        ...(thumbColor ? { '--switch-thumb': thumbColor } : {}),
        ...(activeThumbColor ? { '--switch-active-thumb': activeThumbColor } : {}),
        ...style,
    } as React.CSSProperties;

    return (
        <SwitchPrimitives.Root
            className={cn(
                "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[var(--switch-checked,var(--primary))] data-[state=unchecked]:bg-[var(--switch-unchecked,var(--muted))]",
                className
            )}
            style={customStyles}
            {...props}
            ref={ref}
        >
            <SwitchPrimitives.Thumb
                className={cn(
                    "pointer-events-none block h-4 w-4 rounded-full bg-[var(--switch-thumb,white)] data-[state=checked]:bg-[var(--switch-active-thumb,var(--switch-thumb,white))] shadow-md ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
                )}
            />
        </SwitchPrimitives.Root>
    );
})
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
