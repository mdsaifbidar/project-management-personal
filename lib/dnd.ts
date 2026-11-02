/** Minimal HTML5 drag-and-drop helpers shared by planner, board and lists. */

const MIME = "application/x-decision-item";

export function dragItem(e: React.DragEvent, id: string): void {
  e.dataTransfer.setData(MIME, id);
  e.dataTransfer.setData("text/plain", id);
  e.dataTransfer.effectAllowed = "move";
}

export function droppedItem(e: React.DragEvent): string | null {
  return e.dataTransfer.getData(MIME) || e.dataTransfer.getData("text/plain") || null;
}

export function allowDrop(e: React.DragEvent): void {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}
