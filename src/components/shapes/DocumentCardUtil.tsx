import {
  BaseBoxShapeUtil,
  type TLBaseShape,
  HTMLContainer,
  Rectangle2d,
  type RecordProps,
  T,
} from 'tldraw'

export type DocumentCardShape = TLBaseShape<
  'document-card',
  {
    w: number
    h: number
    title: string
    similarity: number
    theme: string
    themeColor: string
    content: string
    fullContent?: string
    source: string
    keyFinding?: string // NEW: Key finding extracted by LLM (3-7 words)
  }
>

export class DocumentCardUtil extends BaseBoxShapeUtil<DocumentCardShape> {
  static override type = 'document-card' as const

  static override props: RecordProps<DocumentCardShape> = {
    w: T.number,
    h: T.number,
    title: T.string,
    similarity: T.number,
    theme: T.string,
    themeColor: T.string,
    content: T.string,
    fullContent: T.optional(T.string),
    source: T.string,
    keyFinding: T.optional(T.string),
  }

  override getDefaultProps(): DocumentCardShape['props'] {
    return {
      w: 450,
      h: 280,
      title: 'Untitled Document',
      similarity: 0,
      theme: 'Uncategorized',
      themeColor: 'gray',
      content: '',
      fullContent: '',
      source: '',
      keyFinding: '',
    }
  }

  override getGeometry(shape: DocumentCardShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  override component(shape: DocumentCardShape) {
    const { title, similarity, theme, themeColor, content, source, keyFinding } = shape.props

    // Color mapping for theme badges
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-800 border-blue-300',
      green: 'bg-green-100 text-green-800 border-green-300',
      orange: 'bg-orange-100 text-orange-800 border-orange-300',
      red: 'bg-red-100 text-red-800 border-red-300',
      violet: 'bg-violet-100 text-violet-800 border-violet-300',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'light-blue': 'bg-sky-100 text-sky-800 border-sky-300',
      'light-green': 'bg-emerald-100 text-emerald-800 border-emerald-300',
      gray: 'bg-gray-100 text-gray-800 border-gray-300',
    }

    const themeStyles = colorMap[themeColor] || colorMap.gray

    return (
      <HTMLContainer
        style={{
          width: shape.props.w,
          height: shape.props.h,
          display: 'flex',
          flexDirection: 'column',
          pointerEvents: 'all',
        }}
      >
        <div
          className="w-full h-full bg-white rounded-lg shadow-md border-2 border-gray-200 overflow-hidden flex flex-col"
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {/* Key Finding Header - PROMINENT */}
          {keyFinding && (
            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
              <h3
                className="text-base font-bold text-blue-900 line-clamp-2 text-center"
                title={keyFinding}
              >
                {keyFinding}
              </h3>
            </div>
          )}

          {/* Paper Title */}
          <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
            <h4
              className="text-xs font-medium text-gray-700 line-clamp-2"
              title={title}
            >
              {title}
            </h4>
          </div>

          {/* Supporting Detail */}
          <div className="flex-1 px-3 py-2 overflow-hidden">
            <p className="text-xs text-gray-600 line-clamp-3">{content}</p>
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-2">
            {/* Relevance Score */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">
                {(similarity * 100).toFixed(0)}%
              </span>
              <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full"
                  style={{ width: `${similarity * 100}%` }}
                />
              </div>
            </div>

            {/* Source indicator */}
            <span className="text-xs text-gray-400 truncate max-w-[100px]" title={source}>
              {source.split('/').pop()?.replace(/\.[^/.]+$/, '')}
            </span>
          </div>
        </div>
      </HTMLContainer>
    )
  }

  override indicator(shape: DocumentCardShape) {
    return <rect width={shape.props.w} height={shape.props.h} />
  }
}
