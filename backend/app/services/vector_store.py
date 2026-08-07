import chromadb
from typing import List, Dict, Any, Optional


class VectorStore:

    def __init__(
        self,
        persist_directory: str = "./chroma_db",
        collection_name: str = "legal_documents",
    ):
        self.client = chromadb.PersistentClient(
            path=persist_directory
        )

        self.collection = self.client.get_or_create_collection(
            name=collection_name
        )


    # Add Documents


    def add_documents(
        self,
        chunks: List[Dict[str, Any]]
    ) -> None:

        ids = []
        documents = []
        embeddings = []
        metadatas = []

        for chunk in chunks:

            metadata = chunk.get("metadata", {})

            user_id = metadata.get("user_id")
            document_id = metadata.get("document_id")
            source = metadata.get("source", "unknown")
            page = metadata.get("page", 0)
            chunk_index = metadata.get("chunk_index", 0)

            if not user_id:
                raise ValueError("user_id is required in metadata.")

            # Use document_id if available, otherwise fall back
            if document_id:
                unique_id = f"{document_id}_{page}_{chunk_index}"
            else:
                unique_id = f"{user_id}_{source}_{page}_{chunk_index}"

            ids.append(unique_id)

            documents.append(chunk["text"])

            embeddings.append(chunk["embedding"])

            metadatas.append(metadata)

        try:

            self.collection.add(
                ids=ids,
                documents=documents,
                embeddings=embeddings,
                metadatas=metadatas,
            )

        except Exception as e:
            print(f"Error adding vectors: {e}")
            raise


    # Search


    def search(
        self,
        query_embedding: List[float],
        n_results: int = 5,
        where: Optional[dict] = None,
    ):

        return self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where,
        )


    # Get By IDs


    def get_document(
        self,
        ids: List[str],
    ):

        return self.collection.get(
            ids=ids
        )


    # Get Documents


    def get_all_documents(
        self,
        where: Optional[dict] = None,
    ):

        return self.collection.get(
            where=where
        )


    # Count


    def count(self):

        return self.collection.count()

    def count_user_documents(
        self,
        user_id: str,
    ):

        result = self.collection.get(
            where={
                "user_id": user_id
            }
        )

        return len(result.get("ids", []))


    # Delete One Document


    def delete_document(
        self,
        user_id: str,
        source: str,
    ):

        self.collection.delete(
            where={
                "$and": [
                    {
                        "user_id": user_id
                    },
                    {
                        "source": source
                    },
                ]
            }
        )


    # Delete By IDs


    def delete_ids(
        self,
        ids: List[str],
    ):

        self.collection.delete(
            ids=ids
        )


    # Delete User Workspace


    def delete_user_documents(
        self,
        user_id: str,
    ):

        self.collection.delete(
            where={
                "user_id": user_id
            }
        )


    # Development Only

    def reset(self):

        self.client.delete_collection(
            self.collection.name
        )

        self.collection = self.client.get_or_create_collection(
            name="legal_documents"
        )


    # Guest Cleanup


    def delete_expired_guests(
        self,
        expiration_threshold: float,
    ) -> int:

        try:

            results = self.collection.get(
                where={
                    "created_at": {
                        "$lt": expiration_threshold
                    }
                }
            )

            ids_to_delete = []

            if results and results.get("metadatas"):

                for index, metadata in enumerate(results["metadatas"]):

                    user_id = metadata.get("user_id", "")
                    if metadata.get("is_guest", False) or (isinstance(user_id, str) and user_id.startswith("guest_")):

                        ids_to_delete.append(
                            results["ids"][index]
                        )

            if ids_to_delete:

                self.collection.delete(
                    ids=ids_to_delete
                )

            return len(ids_to_delete)

        except Exception as e:

            print(
                f"Guest cleanup failed: {e}"
            )

            return 0


vector_store = VectorStore()