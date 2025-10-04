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
  }

  override getDefaultProps(): DocumentCardShape['props'] {
    return {
      w: 300,
      h: 200,
      title: 'Untitled Document',
      similarity: 0,
      theme: 'Uncategorized',
      themeColor: 'gray',
      content: '',
      fullContent: '',
      source: '',
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
    const { title, similarity, theme, themeColor, content, source } = shape.props

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
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
            <h3
              className="text-sm font-semibold text-gray-900 line-clamp-2"
              title={title}
            >
              {title}
            </h3>
          </div>

          {/* Content Preview */}
          <div className="flex-1 px-3 py-2 overflow-hidden">
            <p className="text-xs text-gray-600 line-clamp-4">{content}</p>
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 flex flex-col gap-2">
            {/* Similarity Bar */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium w-16">
                Relevance
              </span>
              <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full transition-all"
                  style={{ width: `${similarity * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-600 font-mono w-10 text-right">
                {(similarity * 100).toFixed(0)}%
              </span>
            </div>

            {/* Theme Badge */}
            <div className="flex items-center justify-between">
              <span
                className={`text-xs px-2 py-1 rounded-full border font-medium ${themeStyles}`}
              >
                {theme}
              </span>
              <span className="text-xs text-gray-400 truncate max-w-[120px]" title={source}>
                {source.split('/').pop()}
              </span>
            </div>
          </div>
        </div>
      </HTMLContainer>
    )
  }

  override indicator(shape: DocumentCardShape) {
    return <rect width={shape.props.w} height={shape.props.h} />
  }
}
