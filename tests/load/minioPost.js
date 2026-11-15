/** S3 POST needs the file last; k6's object encoder does not preserve order. */
export function minioPost(fields, bytes) {
  const boundary = `fallstack-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const ascii = (text) =>
    Uint8Array.from(text, (char) => {
      const code = char.charCodeAt(0);
      if (code > 127) throw new Error("Expected ASCII signed form fields");
      return code;
    });
  let prefix = "";
  for (const [name, value] of Object.entries(fields)) {
    if (/[\r\n\"]/.test(name) || /[\r\n]/.test(value))
      throw new Error("Invalid signed form field");
    prefix += `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`;
  }
  prefix += `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="load.pdf"\r\nContent-Type: application/pdf\r\n\r\n`;
  const header = ascii(prefix);
  const footer = ascii(`\r\n--${boundary}--\r\n`);
  const file = new Uint8Array(bytes);
  const body = new Uint8Array(header.length + file.length + footer.length);
  body.set(header);
  body.set(file, header.length);
  body.set(footer, header.length + file.length);
  return {
    body: body.buffer,
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}
