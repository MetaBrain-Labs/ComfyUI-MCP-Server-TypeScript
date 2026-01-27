export interface WorkflowCollectionData {
  savedPath: string;
  itemsRequested: number;
  itemsCollected: number;
  offset: number;
  pagination: {
    hasNextPage: boolean;
    nextOffset: number | null;
    currentOffset: number;
    requestedItems: number;
    returnedItems: number;
  };
}
