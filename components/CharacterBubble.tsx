import Image from 'next/image'

type Expression = 'idle' | 'thinking' | 'happy' | 'sad'
type BubbleSize = 'sm' | 'lg'

const EXPRESSION_SRC: Record<Expression, string> = {
  idle: '/characters/idle.png',
  thinking: '/characters/thinking.png',
  happy: '/characters/happy.png',
  sad: '/characters/sad.png',
}

const CHARACTER_SIZE: Record<BubbleSize, number> = {
  sm: 80,
  lg: 160,
}

export default function CharacterBubble({
  expression,
  size = 'lg',
  children,
}: {
  expression: Expression
  size?: BubbleSize
  children: React.ReactNode
}) {
  const isSmall = size === 'sm'

  return (
    <div className={`flex flex-col items-center ${isSmall ? 'gap-1' : 'gap-3'}`}>
      <div
className={`
  relative rounded-2xl border border-border bg-surface
  text-text
  ${isSmall ? 'px-4 py-2 text-sm max-w-[220px]' : 'px-5 py-4 text-base max-w-sm w-full'}
`}
      >
        {children}
        <span
          className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-0 h-0"
          style={{
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid var(--color-surface)',
          }}
          aria-hidden
        />
        <span
          className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2"
          style={{
            borderLeft: '9px solid transparent',
            borderRight: '9px solid transparent',
            borderTop: '9px solid var(--color-border)',
          }}
          aria-hidden
        >
          <span
            className="absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2"
            style={{
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid var(--color-surface)',
              marginTop: '-1px',
            }}
          />
        </span>
      </div>

      <Image
        src={EXPRESSION_SRC[expression]}
        alt=""
        width={CHARACTER_SIZE[size]}
        height={CHARACTER_SIZE[size]}
        priority
      />
    </div>
  )
}