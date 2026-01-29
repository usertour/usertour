const translations = {
  language: 'English',
  productName: 'Usertour',
  privacyPage: {
    title: 'Privacy Policy',
  },
  termsPage: {
    title: 'Terms of Service',
  },
  common: {
    language: 'Language',
    theme: 'Theme',
    search: 'Search...',
    reset: 'Reset',
    addFilter: 'Add filter',
  },
  users: {
    actions: {
      deleteUser: 'Delete user',
      removeFromSegment: 'Remove from this segment',
      deleteSegment: 'Delete segment',
      cancel: 'Cancel',
      confirm: 'Confirm',
      addToManualSegment: 'Add to manual segment',
    },
    dialogs: {
      removeUsersFromSegment: {
        title: 'Confirm removing users from segment',
        description: 'Confirm removing the selected users from {{segmentName}}?',
        confirmButton: 'Yes, remove {{count}} users',
      },
      deleteUsers: {
        titleSingle: 'Confirm deleting the user',
        titleMultiple: 'Confirm deleting the users',
        description:
          'This will delete all traces of the {{userType}} from your account. Including in analytics.',
        descriptionConfirm: 'Confirm deleting the {{userType}}?',
        confirmButtonSingle: 'Yes, delete this user',
        confirmButtonMultiple: 'Yes, delete {{count}} users',
      },
      deleteSegment: {
        title: 'Delete segment',
        description: 'Confirm deleting {{segmentName}}?',
        confirmButton: 'Yes, delete segment',
      },
    },
    empty: {
      noUsersFound: 'No users found',
      noUsersFoundDescription: 'Try adjusting your filters or create new users.',
    },
    detail: {
      title: 'User Detail',
      notFound: 'User not found.',
      userDetails: 'User details',
      userAttributes: 'User attributes',
      unnamedUser: 'Unnamed user',
      tooltips: {
        userId: 'User ID',
        email: 'Email',
        name: 'Name',
        created: 'Created',
      },
    },
    segments: {
      create: 'Create User Segment',
      update: 'Update User Segment',
      form: {
        name: 'Name',
        namePlaceholder: 'Enter user segment name',
        segmentType: 'Segment Type',
        segmentTypeTooltip: 'Determines which kind of segment can be set.',
        filter: 'Filter',
        manual: 'Manual',
        createSegment: 'Create Segment',
        updateSegment: 'Update Segment',
      },
      tooltips: {
        editName: 'Edit user segment name',
        createSegment: 'Create user segment',
      },
    },
    filters: {
      saveFilter: 'Save filter',
      confirmSave: 'Confirm saving {{segmentName}} filter?',
      yesSave: 'Yes, save',
    },
    sessions: {
      loadMore: 'Load More Sessions',
      title: 'User sessions',
      table: {
        content: 'Content',
        progress: 'Progress',
        lastActivity: 'Last activity',
        user: 'User',
      },
    },
    sidebar: {
      segments: 'Segments',
    },
    table: {
      user: 'User',
    },
    toast: {
      filters: {
        saveSuccess: 'The segment {{segmentName}} filter has been successfully saved',
      },
      segments: {
        usersAdded: '{{count}} users added to {{segmentName}}',
        usersRemoved: '{{count}} users has been successfully removed',
        segmentDeleted: 'The segment {{segmentName}} has been successfully deleted',
        segmentCreated: 'Segment "{{segmentName}}" has been created successfully',
        segmentUpdated: 'Segment has been updated to "{{segmentName}}"',
        createFailed: 'Create Segment failed.',
        updateFailed: 'Update Segment failed.',
        noUsersSelected: 'No users selected. Please select at least one user.',
        invalidSegment: 'Invalid segment selected.',
        addFailed: 'Failed to add users to segment.',
      },
      users: {
        usersDeleted: '{{count}} {{userType}} has been successfully deleted',
      },
    },
  },
  companies: {
    actions: {
      deleteCompany: 'Delete company',
      removeFromSegment: 'Remove from this segment',
      deleteSegment: 'Delete segment',
      cancel: 'Cancel',
      confirm: 'Confirm',
      addToManualSegment: 'Add to manual segment',
    },
    dialogs: {
      removeCompaniesFromSegment: {
        title: 'Confirm removing companies from segment',
        description: 'Confirm removing the selected companies from {{segmentName}}?',
        confirmButton: 'Yes, remove {{count}} companies',
      },
      deleteCompanies: {
        titleSingle: 'Confirm deleting the company',
        titleMultiple: 'Confirm deleting the companies',
        description:
          'This will delete all traces of the {{companyType}} from your account. Including in analytics.',
        descriptionConfirm: 'Confirm deleting the {{companyType}}?',
        confirmButtonSingle: 'Yes, delete this company',
        confirmButtonMultiple: 'Yes, delete {{count}} companies',
      },
      deleteSegment: {
        title: 'Delete segment',
        description: 'Confirm deleting {{segmentName}}?',
        confirmButton: 'Yes, delete segment',
      },
    },
    empty: {
      noCompaniesFound: 'No companies found',
      noCompaniesFoundDescription: 'Try adjusting your filters or create new companies.',
    },
    detail: {
      title: 'Company Detail',
      notFound: 'Company not found.',
      companyDetails: 'Company details',
      companyAttributes: 'Company attributes',
      unnamedCompany: 'Unnamed company',
      companyMembers: 'Company members',
      user: 'User',
      membershipAttributes: 'Membership Attributes',
      noMembershipAttributes: 'No membership attributes',
      loadMoreUsers: 'Load More Users',
      loading: 'Loading...',
      noUsersFound: 'No users found for this company.',
      tooltips: {
        companyId: 'Company ID',
        name: 'Name',
        domain: 'Domain',
        created: 'Created',
        reload: 'Reload',
        editName: 'Edit company segment name',
      },
    },
    segments: {
      create: 'Create Company Segment',
      update: 'Update Company Segment',
      form: {
        name: 'Name',
        namePlaceholder: 'Enter company segment name',
        segmentType: 'Segment Type',
        segmentTypeTooltip: 'Determines which kind of segment can be set.',
        filter: 'Filter',
        manual: 'Manual',
        createSegment: 'Create Segment',
        updateSegment: 'Update Segment',
      },
      tooltips: {
        editName: 'Edit company segment name',
        createSegment: 'Create company segment',
      },
    },
    filters: {
      saveFilter: 'Save filter',
      confirmSave: 'Confirm saving {{segmentName}} filter?',
      yesSave: 'Yes, save',
    },
    sidebar: {
      segments: 'Segments',
    },
    table: {
      company: 'Company',
    },
    toast: {
      filters: {
        saveSuccess: 'The segment {{segmentName}} filter has been successfully saved',
      },
      segments: {
        companiesAdded: '{{count}} companies added to {{segmentName}}',
        companiesRemoved: '{{count}} companies has been successfully removed',
        segmentDeleted: 'The segment {{segmentName}} has been successfully deleted',
        segmentCreated: 'Segment "{{segmentName}}" has been created successfully',
        segmentUpdated: 'Segment has been updated to "{{segmentName}}"',
        createFailed: 'Create Segment failed.',
        updateFailed: 'Update Segment failed.',
        noCompaniesSelected: 'No companies selected. Please select at least one company.',
        invalidSegment: 'Invalid segment selected.',
        addFailed: 'Failed to add companies to segment.',
      },
      companies: {
        companiesDeleted: '{{count}} {{companyType}} has been successfully deleted',
      },
    },
  },
  themes: {
    createForm: {
      title: 'Create theme',
      name: {
        label: 'Name',
        placeholder: 'Enter theme name',
        required: 'Please enter your theme name.',
      },
      isDefault: {
        label: 'Set as default theme',
      },
      submit: 'Submit',
      cancel: 'Cancel',
      toast: {
        success: 'Theme created successfully',
        createFailed: 'Create theme failed.',
        projectMissing: 'Project not found. Please refresh the page.',
      },
    },
    listHeader: {
      newTheme: 'New Theme',
      description:
        'With themes, you can make flows and other Usertour content look like a native part of your app.',
    },
  },
};

export default translations;
