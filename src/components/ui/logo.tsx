import { useState } from 'react'
import { cn } from '@/lib/utils/cn'

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className, size = 'md' }: LogoProps) {
  const [imgError, setImgError] = useState(false)

  if (imgError) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex h-7 w-7 items-center justify-center rounded bg-primary text-primary-foreground font-bold text-sm">
          A
        </div>
        <span className="font-semibold tracking-tight text-primary text-sm">
          ALTIS SERVICES
        </span>
      </div>
    )
  }

  // Le JPEG a ~20% de whitespace en haut et ~20% en bas (logo = 60% central).
  // Stratégie : rendre l'image plus haute que le conteneur visible,
  // le conteneur clip le whitespace via overflow-hidden.
  //
  // Calcul : pour un logo visible de Hpx, image = H/0.6, container = H + marge
  //   lg (sidebar)  : logo ~44px → img 74px → container 50px
  //   md (login)     : logo ~38px → img 64px → container 44px
  //   sm (mobile)    : logo ~24px → img 40px → container 28px
  const config = {
    sm: { container: 'h-7',          img: 'h-10'      },
    md: { container: 'h-11',         img: 'h-16'      },
    lg: { container: 'h-[50px]',     img: 'h-[74px]'  },
  }[size]

  return (
    <div className={cn('flex items-center justify-center overflow-hidden', config.container, className)}>
      <img
        src="/logo.jpeg"
        alt="Altis Services"
        className={cn('w-auto object-contain object-center', config.img)}
        onError={() => setImgError(true)}
        draggable={false}
      />
    </div>
  )
}
