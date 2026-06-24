import { useEffect, useRef } from 'react';
import {
  Bold, Italic, Underline, Heading2, List, Link as LinkIcon,
  AlignLeft, AlignCenter, AlignRight,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
}

type ToolButton = {
  icon: typeof Bold;
  title: string;
  run: () => void;
};

/**
 * Dependency-free rich text editor built on a contentEditable div and
 * document.execCommand. Keeps the editor DOM in sync with the `value` prop
 * (without clobbering the caret while the user is typing) and emits the current
 * innerHTML through `onChange`.
 */
export default function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Sync external value -> editor, but only when it actually differs so we
  // don't reset the caret on every keystroke (onChange feeds value back in).
  useEffect(() => {
    const el = editorRef.current;
    if (el && el.innerHTML !== value) {
      el.innerHTML = value || '';
    }
  }, [value]);

  const emit = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const exec = (command: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const addLink = () => {
    const url = window.prompt('Enter the URL:', 'https://');
    if (url) exec('createLink', url);
  };

  const buttons: (ToolButton | 'divider')[] = [
    { icon: Bold, title: 'Bold', run: () => exec('bold') },
    { icon: Italic, title: 'Italic', run: () => exec('italic') },
    { icon: Underline, title: 'Underline', run: () => exec('underline') },
    'divider',
    { icon: Heading2, title: 'Heading', run: () => exec('formatBlock', '<h2>') },
    { icon: List, title: 'Bullet list', run: () => exec('insertUnorderedList') },
    { icon: LinkIcon, title: 'Insert link', run: addLink },
    'divider',
    { icon: AlignLeft, title: 'Align left', run: () => exec('justifyLeft') },
    { icon: AlignCenter, title: 'Align center', run: () => exec('justifyCenter') },
    { icon: AlignRight, title: 'Align right', run: () => exec('justifyRight') },
  ];

  return (
    <div className="rounded-md border border-input bg-background overflow-hidden">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-input bg-muted/50 px-1.5 py-1">
        {buttons.map((b, i) =>
          b === 'divider' ? (
            <span key={`d${i}`} className="mx-1 h-5 w-px bg-border" aria-hidden />
          ) : (
            <button
              key={b.title}
              type="button"
              title={b.title}
              aria-label={b.title}
              // Use onMouseDown + preventDefault so the editor keeps its selection.
              onMouseDown={e => {
                e.preventDefault();
                b.run();
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-gray-600 hover:bg-amber-100 hover:text-amber-700 transition-colors"
            >
              <b.icon className="h-3.5 w-3.5" />
            </button>
          ),
        )}
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        className="prose prose-sm max-w-none min-h-[220px] px-4 py-3 text-sm text-gray-800 focus:outline-none [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-amber-700 [&_a]:underline"
      />
    </div>
  );
}
