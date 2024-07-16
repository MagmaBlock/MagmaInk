import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mime from "mime";
import dotenv from "dotenv";
import crypto from "crypto";

// 加载 .env 文件中的环境变量
dotenv.config();

// 获取当前脚本文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置 S3 客户端
const s3Client = new S3Client({
  region: process.env.S3_REGION, // 从环境变量获取区域
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID, // 从环境变量获取访问密钥 ID
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY, // 从环境变量获取秘密访问密钥
  },
  endpoint: process.env.S3_ENDPOINT, // 从环境变量获取自定义 endpoint
});

// 定义要上传的文件夹路径和目标 S3 桶名称
const localFolderPath =
  process.env.LOCAL_FOLDER_PATH || path.join(__dirname, "../dist");
const folderPath = localFolderPath.replace(/\\/g, "/"); // 替换路径分隔符
const bucketName = process.env.S3_BUCKET_NAME;
const destinationPath = process.env.S3_DESTINATION_PATH || "";

// 计算文件的 MD5 哈希值
const calculateMD5 = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("md5");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (data) => hash.update(data));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
};

// 检查文件是否存在于 S3 且内容一致
const isFileInS3 = async (bucketName, key, localFilePath) => {
  try {
    const headParams = {
      Bucket: bucketName,
      Key: key,
    };

    const headData = await s3Client.send(new HeadObjectCommand(headParams));
    const localFileMD5 = await calculateMD5(localFilePath);

    // 检查 ETag 是否等于本地文件的 MD5 值
    return headData.ETag === `"${localFileMD5}"`;
  } catch (error) {
    // 如果文件未找到，则返回 false
    if (error.name === "NotFound") {
      return false;
    }
    throw error;
  }
};

// 上传单个文件到 S3，并实现失败重传机制
const uploadFileToS3 = async ({
  bucketName,
  key,
  filePath,
  maxRetries = 3,
}) => {
  if (await isFileInS3(bucketName, key, filePath)) {
    console.log(
      `File ${key} already exists in ${bucketName} and is identical. Skipping upload.`,
    );
    return;
  }

  const fileStream = fs.createReadStream(filePath);
  const contentType = mime.getType(filePath) || "application/octet-stream";

  const uploadParams = {
    Bucket: bucketName,
    Key: key.replace(/\\/g, "/"), // 替换路径分隔符
    Body: fileStream,
    ContentType: contentType, // 设置 Content-Type
  };

  let retries = 0;
  while (retries < maxRetries) {
    try {
      const upload = new Upload({
        client: s3Client,
        params: uploadParams,
      });

      await upload.done();
      console.log(
        `Successfully uploaded ${key.replace(/\\/g, "/")} to ${bucketName}`,
      );
      return;
    } catch (error) {
      retries++;
      console.error(
        `Error uploading ${key.replace(/\\/g, "/")}, attempt ${retries} of ${maxRetries}:`,
        error,
      );
      if (retries === maxRetries) {
        console.error(
          `Failed to upload ${key.replace(/\\/g, "/")} after ${maxRetries} attempts`,
        );
      }
    }
  }
};

// 递归收集文件夹中的所有文件路径
const collectFiles = (folderPath, basePath = "") => {
  const files = fs.readdirSync(folderPath);
  let fileList = [];

  for (const file of files) {
    const filePath = path.join(folderPath, file).replace(/\\/g, "/");
    const fileStat = fs.statSync(filePath);

    if (fileStat.isFile()) {
      const key = path.join(basePath, file).replace(/\\/g, "/"); // 文件在 S3 中的键（路径）
      fileList.push({ key, filePath });
    } else if (fileStat.isDirectory()) {
      fileList = fileList.concat(
        collectFiles(filePath, path.join(basePath, file).replace(/\\/g, "/")),
      );
    }
  }

  return fileList;
};

// 执行上传操作
const main = async () => {
  const filesToUpload = collectFiles(folderPath);

  // 并发上传文件
  await Promise.all(
    filesToUpload.map((file) =>
      uploadFileToS3({
        bucketName,
        key: path.join(destinationPath, file.key).replace(/\\/g, "/"),
        filePath: file.filePath,
      }),
    ),
  );
};

main().catch(console.error);
