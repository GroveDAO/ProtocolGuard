export interface ProposalParams {
  protocol: string;
  title: string;
  description: string;
  constraints: string[];
}

/**
 * Builder pattern for constructing upgrade proposals before submission.
 */
export class ProposalBuilder {
  private params: Partial<ProposalParams> = {};

  forProtocol(address: string): this {
    this.params.protocol = address;
    return this;
  }

  withTitle(title: string): this {
    if (!title || title.trim().length === 0) throw new Error("Title cannot be empty");
    this.params.title = title.trim();
    return this;
  }

  withDescription(description: string): this {
    if (!description || description.trim().length === 0) throw new Error("Description cannot be empty");
    this.params.description = description.trim();
    return this;
  }

  withConstraint(constraint: string): this {
    if (!this.params.constraints) this.params.constraints = [];
    this.params.constraints.push(constraint);
    return this;
  }

  withConstraints(constraints: string[]): this {
    this.params.constraints = constraints;
    return this;
  }

  build(): ProposalParams {
    if (!this.params.protocol) throw new Error("Protocol address is required");
    if (!this.params.title) throw new Error("Title is required");
    if (!this.params.description) throw new Error("Description is required");
    return {
      protocol: this.params.protocol,
      title: this.params.title,
      description: this.params.description,
      constraints: this.params.constraints ?? [],
    };
  }

  reset(): this {
    this.params = {};
    return this;
  }
}
