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
    search: '搜索...',
    reset: '重置',
    addFilter: '添加筛选',
  },
  users: {
    actions: {
      deleteUser: '删除用户',
      removeFromSegment: '从此细分中移除',
      deleteSegment: '删除细分',
      cancel: '取消',
      confirm: '确认',
      addToManualSegment: '添加到手动细分',
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
        user: '用户',
      },
    },
    sidebar: {
      segments: '细分',
    },
    table: {
      user: '用户',
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
        noUsersSelected: '未选择用户。请至少选择一个用户。',
        invalidSegment: '选择的细分无效。',
        addFailed: '添加用户到细分失败。',
      },
      users: {
        usersDeleted: '{{count}} 个{{userType}}已成功删除',
      },
    },
  },
  companies: {
    actions: {
      deleteCompany: '删除公司',
      removeFromSegment: '从此细分中移除',
      deleteSegment: '删除细分',
      cancel: '取消',
      confirm: '确认',
      addToManualSegment: '添加到手动细分',
    },
    dialogs: {
      removeCompaniesFromSegment: {
        title: '确认从细分中移除公司',
        description: '确认从 {{segmentName}} 中移除选定的公司？',
        confirmButton: '是的，移除 {{count}} 个公司',
      },
      deleteCompanies: {
        titleSingle: '确认删除公司',
        titleMultiple: '确认删除公司',
        description: '这将从您的账户中删除{{companyType}}的所有痕迹，包括分析数据。',
        descriptionConfirm: '确认删除{{companyType}}？',
        confirmButtonSingle: '是的，删除此公司',
        confirmButtonMultiple: '是的，删除 {{count}} 个公司',
      },
      deleteSegment: {
        title: '删除细分',
        description: '确认删除 {{segmentName}}？',
        confirmButton: '是的，删除细分',
      },
    },
    empty: {
      noCompaniesFound: '未找到公司',
      noCompaniesFoundDescription: '请尝试调整筛选条件或创建新公司。',
    },
    detail: {
      title: '公司详情',
      notFound: '未找到公司。',
      companyDetails: '公司详情',
      companyAttributes: '公司属性',
      unnamedCompany: '未命名公司',
      companyMembers: '公司成员',
      user: '用户',
      membershipAttributes: '成员属性',
      noMembershipAttributes: '无成员属性',
      loadMoreUsers: '加载更多用户',
      loading: '加载中...',
      noUsersFound: '此公司未找到用户。',
      tooltips: {
        companyId: '公司ID',
        name: '名称',
        domain: '域名',
        created: '创建时间',
        reload: '重新加载',
        editName: '编辑公司细分名称',
      },
    },
    segments: {
      create: '创建公司细分',
      update: '更新公司细分',
      form: {
        name: '名称',
        namePlaceholder: '输入公司细分名称',
        segmentType: '细分类型',
        segmentTypeTooltip: '确定可以设置哪种类型的细分。',
        filter: '筛选',
        manual: '手动',
        createSegment: '创建细分',
        updateSegment: '更新细分',
      },
      tooltips: {
        editName: '编辑公司细分名称',
        createSegment: '创建公司细分',
      },
    },
    filters: {
      saveFilter: '保存筛选',
      confirmSave: '确认保存 {{segmentName}} 筛选条件？',
      yesSave: '是的，保存',
    },
    sidebar: {
      segments: '细分',
    },
    table: {
      company: '公司',
    },
    toast: {
      filters: {
        saveSuccess: '细分 {{segmentName}} 的筛选条件已成功保存',
      },
      segments: {
        companiesAdded: '{{count}} 个公司已添加到 {{segmentName}}',
        companiesRemoved: '{{count}} 个公司已成功移除',
        segmentDeleted: '细分 {{segmentName}} 已成功删除',
        segmentCreated: '细分 "{{segmentName}}" 已成功创建',
        segmentUpdated: '细分已更新为 "{{segmentName}}"',
        createFailed: '创建细分失败。',
        updateFailed: '更新细分失败。',
        noCompaniesSelected: '未选择公司。请至少选择一个公司。',
        invalidSegment: '选择的细分无效。',
        addFailed: '添加公司到细分失败。',
      },
      companies: {
        companiesDeleted: '{{count}} 个{{companyType}}已成功删除',
      },
    },
  },
  themes: {
    createForm: {
      title: '创建主题',
      name: {
        label: '名称',
        placeholder: '输入主题名称',
        required: '请输入您的主题名称。',
      },
      isDefault: {
        label: '设置为默认主题',
      },
      submit: '提交',
      cancel: '取消',
      toast: {
        success: '主题创建成功',
        createFailed: '创建主题失败。',
        projectMissing: '未找到项目。请刷新页面。',
      },
    },
    listHeader: {
      newTheme: '新建主题',
      description: '通过主题，您可以让流程和其他 Usertour 内容看起来像是您应用的原生部分。',
    },
  },
};

export default translations;
