const decoder = new TextDecoder("latin1");

export function inspectSaveContainer(buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 12) throw new Error("세이브 컨테이너 헤더가 너무 짧습니다.");
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const magic = String.fromCharCode(...bytes.slice(8, 11));
  const compressionType = bytes[11];
  if (magic === "PlM") return { format: "PlM", supported: false, reason: "Oodle Kraken 압축 형식(PlM)은 브라우저에서 해제할 수 없습니다." };
  if (magic === "CNK") return { format: "CNK", supported: false, reason: "청크형 CNK 컨테이너는 아직 지원하지 않습니다." };
  if (magic !== "PlZ") throw new Error("Palworld PlZ/PlM/CNK 세이브 헤더가 아닙니다.");
  if (![0x31, 0x32].includes(compressionType)) throw new Error("알 수 없는 PlZ 압축 타입입니다.");
  return { format: "PlZ", supported: true, compressionType, uncompressedSize: view.getUint32(0, true), compressedSize: view.getUint32(4, true) };
}

async function inflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function analyzeSave(buffer, knownPals = []) {
  const info = inspectSaveContainer(buffer);
  if (!info.supported) return { ...info, pals: [] };
  let bytes = new Uint8Array(buffer, 12);
  bytes = await inflate(bytes);
  if (info.compressionType === 0x32) bytes = await inflate(bytes);
  if (info.uncompressedSize && bytes.byteLength !== info.uncompressedSize) throw new Error("압축 해제 크기가 헤더와 일치하지 않습니다.");
  const text = decoder.decode(bytes);
  const pals = knownPals.filter((pal) => {
    const ids = [pal.speciesId, pal.formId, pal.name].filter((value) => String(value ?? "").length >= 4);
    return ids.some((id) => text.includes(String(id)));
  }).map((pal) => pal.name);
  return { ...info, decompressedSize: bytes.byteLength, pals: [...new Set(pals)] };
}
