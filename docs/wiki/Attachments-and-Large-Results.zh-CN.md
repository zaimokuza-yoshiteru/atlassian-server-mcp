# 附件与大结果

> **以英文版为准**：[English](Attachments-and-Large-Results.md)

服务器如何在你的机器与 Atlassian 产品之间移动文件与超大载荷——以及防止
agent 打爆内存或磁盘的限制。

## 文件沙箱

所有本地文件访问**默认关闭且沙箱化**：

```bash
export ATLASSIAN_FILE_ROOT=/absolute/path/to/attachments
# 可选产品级覆盖：
export JIRA_FILE_ROOT=...
export CONFLUENCE_FILE_ROOT=...
export BITBUCKET_FILE_ROOT=...
```

没有 file root 时，上传、下载、`outputPath`、`storageValueFile` 均不可用。
每个本地路径必须绝对，且（符号链接解析后）位于 root 之内；逃逸沙箱的
路径被拒绝。非常规文件（FIFO、设备、socket）被拒绝。已存在的下载目标
**永不覆盖**。

## 上传（multipart）

在操作 body 中传本地文件：

```json
{ "files": ["/abs/path/under/file-root/a.png", "/abs/path/under/file-root/b.log"] }
```

限制（三条都在读取任何文件之前校验）：

- 每请求 **10 个文件**
- 单文件 **50 MiB**
- 每请求总计 **100 MiB**

超限返回结构化错误，含文件名、大小与上限。

## 下载

二进制下载（Jira/Confluence 附件、Bitbucket diff/raw/archive）用
`downloadPath`（file root 下的绝对路径）保存到磁盘：

- 默认上限：每次下载 **100 MiB**
- 可调：`--max-download-bytes` / `ATLASSIAN_MAX_DOWNLOAD_BYTES`（最小
  1 MiB）
- 已存在文件永不覆盖

typed 助手 `jira_download_attachment` 与
`confluence_download_attachment` 封装常见场景。

## 大响应：outputPath

预计超过响应预算的读取，给 `atlassian_execute_operation` 或任何只读
typed 工具传 `outputPath`。上游原始 body **流式写入 file root 下的文件**，
不进入内存；结果含 `savedPath` 与 `bytes`。分页被跳过（`hasMore` 恒为
false，无 `nextCursor`）——改用文件系统工具分块读文件。`outputPath` 受
`--max-download-bytes` 上限约束。

## 大 Confluence 页面：storageValueFile

大页面正文用 `confluence_create_content` / `confluence_update_content`
的 `storageValueFile`：file root 下指向 **Confluence storage 格式
XHTML** 文件的绝对路径（上限 **10 MiB**）。文件内容成为
`body.storage.value`（`representation` 固定 `storage`），与内联
`body.storage.value` 互斥。其他格式（Markdown 等）先用 pandoc 等外部
工具转换——服务器不渲染不转换内容。

## 分页与响应预算

MCP 协议分页不覆盖 `tools/call` 内的应用数据，所以读取使用服务器定义的
`cursor` / `nextCursor` 信封：

```ts
{
  cursor?: string;
  pageSize?: number; // 默认 25，最大 100
  responseProfile?: "compact" | "standard" | "full";
  fields?: string[];
  maxOutputBytes?: number;
}
```

- 默认每页序列化响应预算 **65,536 字节**（`--max-output-bytes` /
  `ATLASSIAN_MAX_OUTPUT_BYTES` 可调）。
- `compact` 省略 Jira `customfield_*`，除非用 `fields` 显式选择；
  `jira_list_fields` 把 ID 映射为名称。
- 单个超大对象按稳定 JSON-path 顺序遍历；超长字符串按 UTF-8 字节切分。
- cursor 经 **HMAC 签名**，**15 分钟**过期
  （`--cursor-ttl-seconds` / `ATLASSIAN_CURSOR_TTL_SECONDS`），绑定操作
  与请求参数。
- cursor 只存在于 GET 操作——continuation 不可能重放一个写操作。

`page.hasMore` 为 true 时，把 `page.nextCursor` 连同相同参数传回同一
工具。

---

[English version](Attachments-and-Large-Results.md)（英文版为准）
