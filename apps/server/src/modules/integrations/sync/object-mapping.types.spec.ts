import { BizAttributeTypes } from '@usertour/types';
import { remotePropertyDefinitionFor } from './object-mapping.types';

const attribute = (dataType: number) => ({
  codeName: 'website_lead',
  displayName: 'Website lead',
  dataType,
});

describe('remotePropertyDefinitionFor', () => {
  it('names the property after the object and attribute, in the Usertour group', () => {
    expect(remotePropertyDefinitionFor('user', attribute(BizAttributeTypes.String))).toEqual({
      name: 'usertour_user_website_lead',
      label: 'Usertour: Website lead',
      groupName: 'usertour',
      type: 'string',
      fieldType: 'text',
    });
  });

  it('gives a boolean attribute the two options HubSpot requires of a bool property', () => {
    expect(remotePropertyDefinitionFor('user', attribute(BizAttributeTypes.Boolean))).toMatchObject(
      {
        type: 'bool',
        fieldType: 'booleancheckbox',
        options: [
          { label: 'True', value: 'true' },
          { label: 'False', value: 'false' },
        ],
      },
    );
  });

  it('maps numbers and datetimes to their HubSpot types, everything else to text', () => {
    expect(
      remotePropertyDefinitionFor('company', attribute(BizAttributeTypes.Number)),
    ).toMatchObject({
      name: 'usertour_company_website_lead',
      type: 'number',
      fieldType: 'number',
    });
    expect(
      remotePropertyDefinitionFor('user', attribute(BizAttributeTypes.DateTime)),
    ).toMatchObject({
      type: 'datetime',
      fieldType: 'date',
    });
    expect(remotePropertyDefinitionFor('user', attribute(BizAttributeTypes.List))).toMatchObject({
      type: 'string',
      fieldType: 'text',
    });
  });
});
