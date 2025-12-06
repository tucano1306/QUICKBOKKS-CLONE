'use client'

import * as React from 'react'
import { DayPicker, DayPickerSingleProps, DayPickerRangeProps } from 'react-day-picker'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-4', className)}
      locale={es}
      classNames={{
        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month: 'space-y-4',
        caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-bold text-[#0D2942]',
        nav: 'space-x-1 flex items-center',
        nav_button: cn(
          buttonVariants({ variant: 'outline' }),
          'h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100 hover:bg-green-50 hover:text-[#2CA01C] transition-all duration-200 rounded-lg'
        ),
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex',
        head_cell:
          'text-gray-500 rounded-md w-10 font-semibold text-[0.8rem] uppercase',
        row: 'flex w-full mt-2',
        cell: cn(
          'relative p-0 text-center text-sm focus-within:relative focus-within:z-20',
          '[&:has([aria-selected])]:bg-green-50 [&:has([aria-selected].day-outside)]:bg-green-50/50',
          '[&:has([aria-selected].day-range-end)]:rounded-r-lg',
          '[&:has([aria-selected].day-range-start)]:rounded-l-lg',
          'first:[&:has([aria-selected])]:rounded-l-lg last:[&:has([aria-selected])]:rounded-r-lg'
        ),
        day: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-10 w-10 p-0 font-normal aria-selected:opacity-100 hover:bg-green-50 hover:text-[#2CA01C] transition-all duration-200 rounded-lg'
        ),
        day_range_start: 'day-range-start',
        day_range_end: 'day-range-end',
        day_selected:
          'bg-[#2CA01C] text-white hover:bg-[#108000] hover:text-white focus:bg-[#2CA01C] focus:text-white shadow-lg shadow-green-500/25 rounded-lg',
        day_today: 'bg-green-50 text-[#2CA01C] ring-2 ring-[#2CA01C]/30 font-bold',
        day_outside:
          'day-outside text-gray-300 opacity-50 aria-selected:bg-green-100 aria-selected:text-gray-500',
        day_disabled: 'text-gray-300 opacity-50',
        day_range_middle:
          'aria-selected:bg-green-50 aria-selected:text-[#108000]',
        day_hidden: 'invisible',
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }
