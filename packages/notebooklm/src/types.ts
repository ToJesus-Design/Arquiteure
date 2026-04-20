export interface NotebookSource {
  id: string;
  title: string;
  contentMd: string;
  kind: "text" | "regulation" | "project_doc";
}

export interface Citation {
  sourceId: string;
  sourceTitle: string;
  excerpt: string;
}

export interface NotebookAnswer {
  answer: string;
  citations: Citation[];
}
