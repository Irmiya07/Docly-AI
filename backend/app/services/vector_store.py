import chromadb
from typing import List, Dict, Any, Optional


class VectorStore:

    def __init__(
        self,
        persist_directory: str = "./chroma_db",
        collection_name: str = "legal_documents"
    ):
        self.client = chromadb.PersistentClient(
            path=persist_directory
        )

        self.collection = self.client.get_or_create_collection(
            name=collection_name
        )

    def add_documents(
        self,
        chunks: List[Dict[str, Any]]
    ) -> None:

        ids = []
        documents = []
        embeddings = []
        metadatas = []

        for chunk in chunks:

            metadata = chunk["metadata"]

            source = metadata["source"]
            page = metadata["page"]
            chunk_index = metadata["chunk_index"]

            ids.append(
                f"{source}_{page}_{chunk_index}"
            )

            documents.append(
                chunk["text"]
            )

            embeddings.append(
                chunk["embedding"]
            )

            metadatas.append(
                metadata
            )

        self.collection.add(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas
        )

    def search(
        self,
        query_embedding: List[float],
        n_results: int = 5,
        where: Optional[dict] = None
    ):

        return self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where
        )

    def get_document(
        self,
        ids: List[str]
    ):

        return self.collection.get(
            ids=ids
        )

    def get_all_documents(self):

        return self.collection.get()

    def count(self):

        return self.collection.count()

    def delete_document(
        self,
        source: str
    ):

        self.collection.delete(
            where={
                "source": source
            }
        )

    def delete_ids(
        self,
        ids: List[str]
    ):

        self.collection.delete(
            ids=ids
        )

    def reset(self):

        self.client.delete_collection(
            self.collection.name
        )

        self.collection = self.client.get_or_create_collection(
            name="legal_documents"
        )


vector_store = VectorStore()