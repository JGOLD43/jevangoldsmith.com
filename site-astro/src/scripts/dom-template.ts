export function cloneTemplateElement<T extends Element = HTMLElement>(templateId: string): T | null {
  const template = document.getElementById(templateId) as HTMLTemplateElement | null;
  const element = template?.content.firstElementChild;
  return element ? (element.cloneNode(true) as T) : null;
}
