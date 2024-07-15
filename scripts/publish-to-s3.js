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
const folderPath = path.join(__dirname, "../dist"); // 指定 /dist 文件夹
const bucketName = process.env.S3_BUCKET_NAME; // 从环境变量获取 S3 桶名称

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

    return headData.ETag === `"${localFileMD5}"`;
  } catch (error) {
    // 如果文件未找到，则返回 false
    if (error.name === "NotFound") {
      return false;
    }
    throw error;
  }
};

// 递归上传文件夹中的所有文件到 S3
const uploadFolderToS3 = async (folderPath, bucketName, basePath = "dist") => {
  const files = fs.readdirSync(folderPath);

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const fileStat = fs.statSync(filePath);

    if (fileStat.isFile()) {
      const key = path.join(basePath, file).replace(/\\/g, "/"); // 文件在 S3 中的键（路径）

      if (await isFileInS3(bucketName, key, filePath)) {
        console.log(
          `File ${key} already exists in ${bucketName} and is identical. Skipping upload.`,
        );
        continue;
      }

      const fileStream = fs.createReadStream(filePath);
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
  await uploadFolderToS3(folderPath, bucketName);
};

main().catch(console.error);
