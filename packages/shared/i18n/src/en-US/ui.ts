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
  },
  users: {
    actions: {
      deleteUser: 'Delete user',
      removeFromSegment: 'Remove from this segment',
      deleteSegment: 'Delete segment',
      cancel: 'Cancel',
      confirm: 'Confirm',
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
      },
    },
    sidebar: {
      segments: 'Segments',
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
      },
      users: {
        usersDeleted: '{{count}} {{userType}} has been successfully deleted',
      },
    },
  },
};

export default translations;
