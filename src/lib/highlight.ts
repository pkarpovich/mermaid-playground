const KEYWORDS =
  /\b(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram-v2|stateDiagram|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline|quadrantChart|requirementDiagram|subgraph|end|participant|actor|loop|alt|else|opt|par|and|rect|note|activate|deactivate|class|state|direction|title|section|TD|TB|LR|RL|BT)\b/g;

const ARROWS =
  /(--&gt;&gt;|-&gt;&gt;|--&gt;|---|-\.-&gt;|-\.-|==&gt;|===|--x|--o|\.\.&gt;|::|--)/g;

const BRACKETS = /(\[[^\]]*\]|\{[^}]*\}|\([^)]*\)|\|[^|]*\|)/g;

const escape = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function highlight(code: string): string {
  return code
    .split('\n')
    .map((line) => {
      if (/^\s*%%/.test(line)) {
        return '<span class="tk-comment">' + escape(line) + '</span>';
      }
      let h = escape(line);
      h = h.replace(KEYWORDS, '<span class="tk-key">$1</span>');
      h = h.replace(ARROWS, '<span class="tk-arrow">$1</span>');
      h = h.replace(BRACKETS, '<span class="tk-str">$1</span>');
      return h.length ? h : ' ';
    })
    .join('\n');
}
