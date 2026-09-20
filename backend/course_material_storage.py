import os
from dataclasses import dataclass

import boto3


MAX_PDF_BYTES = 25 * 1024 * 1024


class CourseMaterialStorageError(RuntimeError):
    pass


@dataclass(frozen=True)
class StoredObject:
    body: object
    content_length: int
    content_type: str


class CourseMaterialStorage:
    def __init__(self, *, bucket: str, endpoint_url: str | None = None, region: str | None = None):
        self.bucket = bucket
        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint_url or None,
            region_name=region or None,
        )

    @classmethod
    def from_env(cls):
        bucket = os.environ.get("COURSE_MATERIAL_BUCKET", "").strip()
        if not bucket:
            raise CourseMaterialStorageError("course_material_storage_not_configured")
        endpoint = os.environ.get("COURSE_MATERIAL_ENDPOINT_URL", "").strip() or None
        if endpoint and not endpoint.startswith("https://"):
            raise CourseMaterialStorageError("course_material_storage_invalid_endpoint")
        region = os.environ.get("COURSE_MATERIAL_REGION", "").strip() or None
        return cls(bucket=bucket, endpoint_url=endpoint, region=region)

    def put_pdf(self, *, object_key: str, content: bytes):
        self.client.put_object(
            Bucket=self.bucket,
            Key=object_key,
            Body=content,
            ContentType="application/pdf",
            CacheControl="private, no-store",
        )

    def get_pdf(self, *, object_key: str) -> StoredObject:
        result = self.client.get_object(Bucket=self.bucket, Key=object_key)
        return StoredObject(
            body=result["Body"],
            content_length=int(result.get("ContentLength") or 0),
            content_type=result.get("ContentType") or "application/pdf",
        )

    def delete(self, *, object_key: str):
        self.client.delete_object(Bucket=self.bucket, Key=object_key)


def get_course_material_storage() -> CourseMaterialStorage:
    return CourseMaterialStorage.from_env()
