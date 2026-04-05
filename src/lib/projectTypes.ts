export type EditorSquareMode = "crop" | "pad";
export type EditorLandscapeAlign = "top" | "center" | "bottom";

export interface SavedCrop {
  unit: "%";
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ProjectStep = "crop" | "done";

export interface ProjectSettings {
  downloadName: string;
  squareMode: EditorSquareMode;
  landscapeAlign: EditorLandscapeAlign;
  crop?: SavedCrop;
  step: ProjectStep;
}
