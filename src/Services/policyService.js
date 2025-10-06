const Policy = require('../models/Policy');
const ApiError = require('../utils/apiError');
const { HTTP_STATUS } = require('../utils/constants');

class PolicyService {
  async createPolicy(policyData) {
    const existingPolicy = await Policy.findOne({ name: policyData.name });
    if (existingPolicy) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Policy already exists');
    }

    const policy = await Policy.create(policyData);
    return policy;
  }

  async getAllPolicies() {
    return await Policy.find();
  }

  async getPolicyById(policyId) {
    const policy = await Policy.findById(policyId);
    if (!policy) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Policy not found');
    }
    return policy;
  }

  async updatePolicy(policyId, updateData) {
    const policy = await Policy.findByIdAndUpdate(
      policyId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!policy) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Policy not found');
    }

    return policy;
  }

  async deletePolicy(policyId) {
    const policy = await Policy.findById(policyId);
    
    if (!policy) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Policy not found');
    }

    if (policy.isSystem) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Cannot delete system policy');
    }

    await Policy.findByIdAndDelete(policyId);
    return policy;
  }

  evaluatePolicy(user, action, resource) {
    let isAllowed = false;

    for (const policy of user.policies) {
      for (const statement of policy.statements) {
        const actionMatch = statement.actions.includes('*') || statement.actions.includes(action);
        const resourceMatch = statement.resources.includes('*') || statement.resources.includes(resource);

        if (actionMatch && resourceMatch) {
          if (statement.effect === 'Deny') {
            return false;
          }
          if (statement.effect === 'Allow') {
            isAllowed = true;
          }
        }
      }
    }

    return isAllowed;
  }
}

module.exports = new PolicyService();