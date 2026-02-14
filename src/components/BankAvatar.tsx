import { Building2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface BankAvatarProps {
  logoUrl: string | null | undefined
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
}

const iconSizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
}

export function BankAvatar({ logoUrl, name, size = 'md', className }: BankAvatarProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-primary/10 overflow-hidden shrink-0',
        sizeClasses[size],
        className
      )}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={name}
          className="h-full w-full object-cover"
        />
      ) : (
        <Building2 className={cn('text-primary', iconSizeClasses[size])} />
      )}
    </div>
  )
}
