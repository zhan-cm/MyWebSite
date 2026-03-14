# Chemic.dev


个人主页与技术记录的源码仓库。基于 Astro 和 Tailwind CSS 构建的静态站点，采用 GitHub Actions 实现自动化部署。

🔗 **线上访问:** [www.aichezhan.top](http://www.aichezhan.top)

## 💡 核心特性

- **主控台 (Dashboard):** 模块化展示技术栈矩阵与开发中的活跃项目。
- **精神食粮库 (Media Collection):** 纯数据驱动的番剧与小说记录墙。
- **开发日志 (Changelog):** 垂直时间轴记录建站历程。
- **自动化部署 (CI/CD):** 接入 GitHub Actions，代码推送到 master 分支后自动打包并发布到阿里云服务器。

## 🛠️ 技术栈

- **框架:** [Astro v4](https://astro.build/)
- **样式:** [Tailwind CSS](https://tailwindcss.com/)
- **部署:** Nginx + GitHub Actions
- **环境:** Node.js 20+

## 🚀 本地开发

```bash
# 1. 克隆项目
git clone [https://github.com/zhan-cm/MyWebSite.git](https://github.com/zhan-cm/MyWebSite.git)

# 2. 进入项目目录
cd MyWebSite

# 3. 安装依赖
npm install

# 4. 启动本地开发服务器
npm run dev

本地服务器启动后，浏览器访问 http://localhost:4321 进行实时预览。

```

## 📁 目录结构
Plaintext
├── public/                # 静态资源 (图片、图标等)
├── src/
│   ├── layouts/           # 页面全局布局模板
│   ├── pages/             # 路由页面 (主页、娱乐页、日志页)
│   └── global.css         # 全局样式配置
├── .github/workflows/     # CI/CD 自动化部署脚本
└── astro.config.mjs       # Astro 核心配置文件

## 👨‍💻 关于作者
GitHub: @zhan-cm

专业方向: 软件工程 / 后端开发