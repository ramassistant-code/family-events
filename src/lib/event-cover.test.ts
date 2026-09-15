import { describe, expect, it } from "vitest";
import {
  COVER_ERRORS,
  COVER_MAX_BYTES,
  isEventId,
  storagePathFromPublicUrl,
  validateCoverFile,
} from "./event-cover";

describe("validateCoverFile", () => {
  it("accepts jpeg, png, and webp under 5MB", () => {
    expect(validateCoverFile({ type: "image/jpeg", size: 1024, name: "a.jpg" })).toEqual({
      ok: true,
      mime: "image/jpeg",
      ext: "jpg",
    });
    expect(validateCoverFile({ type: "image/jpg", size: 1024, name: "a.jpg" })).toEqual({
      ok: true,
      mime: "image/jpeg",
      ext: "jpg",
    });
    expect(validateCoverFile({ type: "image/png", size: 2048, name: "a.png" })).toEqual({
      ok: true,
      mime: "image/png",
      ext: "png",
    });
    expect(validateCoverFile({ type: "image/webp", size: 1, name: "a.webp" })).toEqual({
      ok: true,
      mime: "image/webp",
      ext: "webp",
    });
  });

  it("accepts a missing MIME type when the file extension is allowed", () => {
    expect(validateCoverFile({ type: "", size: 100, name: "cover.JPEG" })).toEqual({
      ok: true,
      mime: "image/jpeg",
      ext: "jpg",
    });
  });

  it("rejects empty files, oversize files, and disallowed types", () => {
    expect(validateCoverFile(null)).toEqual({ ok: false, error: COVER_ERRORS.missingFile });
    expect(validateCoverFile({ type: "image/jpeg", size: 0 })).toEqual({
      ok: false,
      error: COVER_ERRORS.missingFile,
    });
    expect(validateCoverFile({ type: "image/jpeg", size: COVER_MAX_BYTES + 1, name: "a.jpg" })).toEqual({
      ok: false,
      error: COVER_ERRORS.tooLarge,
    });
    expect(validateCoverFile({ type: "image/gif", size: 100, name: "a.gif" })).toEqual({
      ok: false,
      error: COVER_ERRORS.invalidType,
    });
    expect(validateCoverFile({ type: "application/pdf", size: 100, name: "a.pdf" })).toEqual({
      ok: false,
      error: COVER_ERRORS.invalidType,
    });
  });

  it("accepts a file at the 5MB limit", () => {
    expect(validateCoverFile({ type: "image/png", size: COVER_MAX_BYTES, name: "a.png" }).ok).toBe(true);
  });
});

describe("storagePathFromPublicUrl", () => {
  const supabaseUrl = "https://abcd.supabase.co";

  it("extracts the object path from a public Storage URL", () => {
    const url =
      "https://abcd.supabase.co/storage/v1/object/public/event-covers/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.jpg";
    expect(storagePathFromPublicUrl(url, supabaseUrl)).toBe(
      "11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.jpg",
    );
  });

  it("strips query strings and decodes the path", () => {
    const url =
      "https://abcd.supabase.co/storage/v1/object/public/event-covers/eid%2Ffile.webp?version=1";
    expect(storagePathFromPublicUrl(url)).toBe("eid/file.webp");
  });

  it("rejects other buckets, hosts, or traversal", () => {
    expect(
      storagePathFromPublicUrl(
        "https://abcd.supabase.co/storage/v1/object/public/other/eid/a.jpg",
        supabaseUrl,
      ),
    ).toBeNull();
    expect(
      storagePathFromPublicUrl(
        "https://evil.example/storage/v1/object/public/event-covers/eid/a.jpg",
        supabaseUrl,
      ),
    ).toBeNull();
    expect(
      storagePathFromPublicUrl(
        "https://abcd.supabase.co/storage/v1/object/public/event-covers/../secret.jpg",
        supabaseUrl,
      ),
    ).toBeNull();
    expect(storagePathFromPublicUrl("not-a-url")).toBeNull();
  });
});

describe("isEventId", () => {
  it("accepts UUID event ids and rejects other strings", () => {
    expect(isEventId("11111111-1111-1111-1111-111111111111")).toBe(true);
    expect(isEventId("not-a-uuid")).toBe(false);
    expect(isEventId("")).toBe(false);
  });
});
