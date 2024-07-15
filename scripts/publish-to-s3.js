import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mime from "mime";

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
const folderPath = path.join(__dirname, "../dist"); // 指定 /dist 文件夹
const bucketName = process.env.S3_BUCKET_NAME; // 从环境变量获取 S3 桶名称

// 删除 S3 桶中的 /dist/ 目录
const clearS3DistFolder = async (bucketName) => {
  const listParams = {
    Bucket: bucketName,
    Prefix: "dist/", // 仅列出 /dist/ 目录中的对象
  };

  try {
    const listedObjects = await s3Client.send(
      new ListObjectsV2Command(listParams),
    );

    if (listedObjects.Contents.length === 0) return;

    const deleteParams = {
      Bucket: bucketName,
      Delete: { Objects: [] },
    };

    listedObjects.Contents.forEach(({ Key }) => {
      deleteParams.Delete.Objects.push({ Key });
    });

    await s3Client.send(new DeleteObjectsCommand(deleteParams));

    if (listedObjects.IsTruncated) await clearS3DistFolder(bucketName);
  } catch (error) {
    console.error("Error clearing /dist/ folder in S3:", error);
  }
};

// 递归上传文件夹中的所有文件到 S3
const uploadFolderToS3 = async (folderPath, bucketName, basePath = "dist") => {
  const files = fs.readdirSync(folderPath);

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const fileStat = fs.statSync(filePath);

    if (fileStat.isFile()) {
      const fileStream = fs.createReadStream(filePath);
      const key = path.join(basePath, file).replace(/\\/g, "/"); // 文件在 S3 中的键（路径）
      const contentType = mime.getType(filePath) || "application/octet-stream";

      const uploadParams = {
        Bucket: bucketName,
        Key: key,
        Body: fileStream,
        ContentType: contentType, // 设置 Content-Type
      };

      try {
        const upload = new Upload({
          client: s3Client,
          params: uploadParams,
        });

        await upload.done();
        console.log(`Successfully uploaded ${key} to ${bucketName}`);
      } catch (error) {
        console.error(`Error uploading ${key}:`, error);
      }
    } else if (fileStat.isDirectory()) {
      await uploadFolderToS3(filePath, bucketName, path.join(basePath, file));
    }
  }
};

// 执行上传操作
const main = async () => {
  await clearS3DistFolder(bucketName);
  await uploadFolderToS3(folderPath, bucketName);
};

main().catch(console.error);
