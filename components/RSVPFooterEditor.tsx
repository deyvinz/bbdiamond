'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import { useEffect, useState } from 'react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Link as LinkIcon,
  Undo,
  Redo
} from 'lucide-react'

interface RSVPFooterEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
}

/**
 * WYSIWYG editor for RSVP form footer HTML
 * Focuses on common formatting: bold, italic, links, lists
 */
export default function RSVPFooterEditor({ 
  content, 
  onChange, 
  placeholder = "Enter RSVP footer message..." 
}: RSVPFooterEditorProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] p-4',
        placeholder,
      },
    },
    immediatelyRender: false,
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  if (!isMounted || !editor) {
    return (
      <div className="border rounded-md min-h-[200px] bg-white p-4">
        <p className="text-sm text-gray-500">Loading editor...</p>
      </div>
    )
  }

  const handleAddLink = () => {
    if (linkUrl && linkText) {
      editor.chain().focus().insertContent(`<a href="${linkUrl}">${linkText}</a>`).run()
      setLinkUrl('')
      setLinkText('')
      setShowLinkDialog(false)
    }
  }

  const MenuButton = ({ onClick, isActive, title, children }: { onClick: () => void; isActive?: boolean; title: string; children: React.ReactNode }) => (
    <Button
      type="button"
      variant={isActive ? 'default' : 'ghost'}
      size="sm"
      onClick={onClick}
      title={title}
      className="h-8 w-8 p-0"
    >
      {children}
    </Button>
  )

  return (
    <div className="border rounded-md bg-white">
      {/* Toolbar */}
      <div className="border-b p-2 flex items-center gap-1 flex-wrap">
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </MenuButton>
        
        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </MenuButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </MenuButton>
        
        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </MenuButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <MenuButton
          onClick={() => {
            const { from, to } = editor.state.selection
            const selectedText = editor.state.doc.textBetween(from, to)
            setLinkText(selectedText || '')
            setShowLinkDialog(true)
          }}
          title="Add Link"
        >
          <LinkIcon className="h-4 w-4" />
        </MenuButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <MenuButton
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </MenuButton>
        
        <MenuButton
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </MenuButton>
      </div>

      {/* Editor Content */}
      <div className="min-h-[150px] bg-white">
        <EditorContent 
          editor={editor} 
          className="prose prose-sm max-w-none focus:outline-none p-4"
        />
      </div>

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="border-t p-4 bg-gray-50">
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Link URL"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
            <input
              type="text"
              placeholder="Link Text"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleAddLink}
                disabled={!linkUrl || !linkText}
              >
                Add Link
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowLinkDialog(false)
                  setLinkUrl('')
                  setLinkText('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

