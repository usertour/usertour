const translations = {
  language: '简体中文',
  productName: 'Usertour',
  privacyPage: {
    title: '隐私政策',
  },
  termsPage: {
    title: '服务条款',
  },
  common: {
    language: '语言',
    theme: '主题',
  },
  users: {
    actions: {
      deleteUser: '删除用户',
      removeFromSegment: '从此细分中移除',
      deleteSegment: '删除细分',
      cancel: '取消',
      confirm: '确认',
    },
    dialogs: {
      removeUsersFromSegment: {
        title: '确认从细分中移除用户',
        description: '确认从 {{segmentName}} 中移除选定的用户？',
        confirmButton: '是的，移除 {{count}} 个用户',
      },
      deleteUsers: {
        titleSingle: '确认删除用户',
        titleMultiple: '确认删除用户',
        description: '这将从您的账户中删除{{userType}}的所有痕迹，包括分析数据。',
        descriptionConfirm: '确认删除{{userType}}？',
        confirmButtonSingle: '是的，删除此用户',
        confirmButtonMultiple: '是的，删除 {{count}} 个用户',
      },
      deleteSegment: {
        title: '删除细分',
        description: '确认删除 {{segmentName}}？',
        confirmButton: '是的，删除细分',
      },
    },
    empty: {
      noUsersFound: '未找到用户',
      noUsersFoundDescription: '请尝试调整筛选条件或创建新用户。',
    },
    detail: {
      title: '用户详情',
      notFound: '未找到用户。',
      userDetails: '用户详情',
      userAttributes: '用户属性',
      unnamedUser: '未命名用户',
      tooltips: {
        userId: '用户ID',
        email: '邮箱',
        name: '姓名',
        created: '创建时间',
      },
    },
    segments: {
      create: '创建用户细分',
      update: '更新用户细分',
      form: {
        name: '名称',
        namePlaceholder: '输入用户细分名称',
        segmentType: '细分类型',
        segmentTypeTooltip: '确定可以设置哪种类型的细分。',
        filter: '筛选',
        manual: '手动',
        createSegment: '创建细分',
        updateSegment: '更新细分',
      },
      tooltips: {
        editName: '编辑用户细分名称',
        createSegment: '创建用户细分',
      },
    },
    filters: {
      saveFilter: '保存筛选',
      confirmSave: '确认保存 {{segmentName}} 筛选条件？',
      yesSave: '是的，保存',
    },
    sessions: {
      loadMore: '加载更多会话',
      title: '用户会话',
      table: {
        content: '内容',
        progress: '进度',
        lastActivity: '最后活动',
      },
    },
    sidebar: {
      segments: '细分',
    },
    toast: {
      filters: {
        saveSuccess: '细分 {{segmentName}} 的筛选条件已成功保存',
      },
      segments: {
        usersAdded: '{{count}} 个用户已添加到 {{segmentName}}',
        usersRemoved: '{{count}} 个用户已成功移除',
        segmentDeleted: '细分 {{segmentName}} 已成功删除',
        segmentCreated: '细分 "{{segmentName}}" 已成功创建',
        segmentUpdated: '细分已更新为 "{{segmentName}}"',
        createFailed: '创建细分失败。',
        updateFailed: '更新细分失败。',
      },
      users: {
        usersDeleted: '{{count}} 个{{userType}}已成功删除',
      },
    },
  },
};

export default translations;
