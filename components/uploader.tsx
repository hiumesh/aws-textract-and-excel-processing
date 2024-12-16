"use client";

import { useDropzone } from "react-dropzone";

export default function FileUploader() {
  const { acceptedFiles, getRootProps, getInputProps } = useDropzone({
    multiple: false,
    accept: {
      "image/*": [".png", ".jpeg"],
      pdf: [".pdf"],
    },
  });

  const files = acceptedFiles.map((file) => (
    <li key={file.path}>
      {file.path} - {file.size} bytes
    </li>
  ));

  return (
    <section className="">
      <div
        {...getRootProps({ className: "dropzone" })}
        className="p-10 bg-gray-50 rounded border border-dashed border-gray-200"
      >
        <input {...getInputProps()} />
        <p>Drag &apos;n&apos; drop some files here, or click to select files</p>
      </div>
      <aside>
        <h4>Files</h4>
        <ul>{files}</ul>
      </aside>
    </section>
  );
}
