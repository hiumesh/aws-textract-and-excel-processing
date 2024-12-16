import { NextRequest, NextResponse } from "next/server";
// import fs from "fs";
import {
  TextractClient,
  // AnalyzeExpenseCommand,
  AnalyzeDocumentCommand,
} from "@aws-sdk/client-textract";
import { processAnalyzeDocumentData } from "./aws";
import { extractColumns } from "./excel";

const client = new TextractClient({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
  region: "ap-south-1",
});

async function analyzeDocument(blob: Buffer) {
  const command = new AnalyzeDocumentCommand({
    Document: {
      Bytes: blob,
    },
    FeatureTypes: ["LAYOUT", "TABLES", "FORMS", "QUERIES"],
    QueriesConfig: {
      Queries: [
        {
          Text: "What is the total revenue of 2022",
        },
        {
          Text: "What is the total revenue of 2021",
        },
        {
          Text: "What is the total expense",
        },
        {
          Text: "What is the total tax expense",
        },
        {
          Text: "What is the total not categorized expenses",
        },
        {
          Text: "What is the bifurcation of total expense",
        },
      ],
    },
  });
  // const command = new AnalyzeExpenseCommand({
  //   Document: {
  //     Bytes: blob,
  //   },
  // });
  const response = await client.send(command);
  return response;
}

export const POST = async (req: NextRequest) => {
  try {
    const formData = await req.formData();
    const body = Object.fromEntries(formData);
    const file = (body.file as Blob) || null;

    if (!file) throw new Error("File not found!");

    console.log(file.type);

    if (
      [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/csv",
      ].includes(file.type)
    ) {
      const data = await extractColumns(file, file.type);
      return NextResponse.json({ rows: data });
    } else if (file.type === "application/pdf") {
      const buffer = Buffer.from(await file.arrayBuffer());

      const data = await analyzeDocument(buffer);
      if (!data.Blocks) throw new Error("No blocks found!");

      const processedData = processAnalyzeDocumentData({ Blocks: data.Blocks });

      // fs.writeFileSync("original.json", JSON.stringify(data));
      // fs.writeFileSync("processed.json", JSON.stringify(processedData));

      return NextResponse.json(processedData);
    }
    throw new Error("Unsupported file type");
  } catch (error) {
    console.log(error);
    if (error instanceof Error) {
      return NextResponse.json(
        {
          message: error?.message || "Something went wrong!",
        },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        {
          message: "Something went wrong!",
        },
        { status: 400 }
      );
    }
  }
};
