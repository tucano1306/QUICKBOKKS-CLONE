"use client"

import * as React from "react"
import { useEffect, useRef, useCallback } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md", 
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  full: "max-w-4xl w-full"
}

const Modal = React.forwardRef<HTMLDialogElement, ModalProps>(
  ({ isOpen, onClose, children, className, size = "lg" }, ref) => {
    const dialogRef = useRef<HTMLDialogElement>(null)
    const combinedRef = (ref as React.RefObject<HTMLDialogElement>) || dialogRef

    const handleClose = useCallback(() => {
      onClose()
    }, [onClose])

    useEffect(() => {
      const dialog = combinedRef.current
      if (!dialog) return

      if (isOpen) {
        if (!dialog.open) {
          dialog.showModal()
        }
      } else {
        dialog.close()
      }
    }, [isOpen, combinedRef])

    useEffect(() => {
      const dialog = combinedRef.current
      if (!dialog) return

      const handleCancel = (e: Event) => {
        e.preventDefault()
        handleClose()
      }

      dialog.addEventListener('cancel', handleCancel)
      return () => dialog.removeEventListener('cancel', handleCancel)
    }, [combinedRef, handleClose])

    return (
      <dialog
        ref={combinedRef}
        className={cn(
          "backdrop:bg-black/60 backdrop:backdrop-blur-sm",
          "bg-white w-full rounded-xl sm:rounded-2xl shadow-2xl border border-gray-100",
          "animate-in zoom-in-95 duration-200",
          "max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col",
          "p-0 m-auto",
          sizeClasses[size],
          className
        )}
      >
        {children}
      </dialog>
    )
  }
)
Modal.displayName = "Modal"

const ModalHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { onClose?: () => void; showClose?: boolean }
>(({ className, children, onClose, showClose = true, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100",
      "bg-gradient-to-r from-[#0D2942] to-[#1a4565]",
      className
    )}
    {...props}
  >
    <div className="text-white flex-1 min-w-0">{children}</div>
    {showClose && onClose && (
      <button
        onClick={onClose}
        className="text-white/70 hover:text-white hover:bg-white/10 rounded-full p-1.5 transition-all duration-200 ml-2 flex-shrink-0"
        aria-label="Cerrar"
      >
        <X className="h-5 w-5" />
      </button>
    )}
  </div>
))
ModalHeader.displayName = "ModalHeader"

const ModalTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h2
    ref={ref}
    aria-label={typeof children === 'string' ? children : undefined}
    className={cn(
      "text-base sm:text-lg font-semibold text-white truncate",
      className
    )}
    {...props}
  >
    {children}
  </h2>
))
ModalTitle.displayName = "ModalTitle"

const ModalDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs sm:text-sm text-white/70", className)}
    {...props}
  />
))
ModalDescription.displayName = "ModalDescription"

const ModalContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex-1 overflow-y-auto p-4 sm:p-6", className)}
    {...props}
  />
))
ModalContent.displayName = "ModalContent"

const ModalFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col-reverse sm:flex-row items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 bg-gray-50/50",
      className
    )}
    {...props}
  />
))
ModalFooter.displayName = "ModalFooter"

export { Modal, ModalHeader, ModalTitle, ModalDescription, ModalContent, ModalFooter }

