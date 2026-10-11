export function download(data: Uint8Array | string, name: string, type = 'application/octet-stream') {
  const url = URL.createObjectURL(new Blob([typeof data === 'string' ? data : new Uint8Array(data)], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
