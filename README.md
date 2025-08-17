# LearnSphere

A blockchain-powered EdTech platform that addresses credential fraud and unequal access to education by enabling verifiable, on-chain certifications, decentralized course marketplaces, and community-driven funding for learners worldwide.

---

## Overview

LearnSphere consists of four main smart contracts that together form a transparent, decentralized ecosystem for educators, students, and institutions:

1. **Credential NFT Contract** – Issues and manages verifiable NFTs for course completions and certifications.
2. **Course Marketplace Contract** – Facilitates course creation, enrollment, and automated payments.
3. **Governance DAO Contract** – Enables community voting on platform decisions and resource allocation.
4. **Scholarship Pool Contract** – Crowdfunds and distributes scholarships to underprivileged learners.

---

## Features

- **Verifiable NFT credentials** that prevent fraud and enable easy employer verification  
- **Decentralized course marketplace** for educators to list and monetize content  
- **Automated enrollment and payments** with revenue sharing for creators  
- **DAO governance** for platform upgrades and funding proposals  
- **Crowdfunded scholarships** distributed transparently to qualified students  
- **On-chain progress tracking** integrated with real-world learning milestones  
- **Global accessibility** without intermediaries, reducing costs for users in developing regions  

---

## Smart Contracts

### Credential NFT Contract
- Mint NFTs as proof of course completion or certification
- Metadata updates for skills and grades via oracle verification
- Transfer and revocation mechanisms for institutions

### Course Marketplace Contract
- List courses with descriptions, prices, and prerequisites
- Handle enrollments, token payments, and access gating
- Automated royalty splits for collaborators and platform fees

### Governance DAO Contract
- Token-weighted voting on proposals (e.g., new features or fund allocations)
- On-chain execution of approved decisions
- Quorum requirements and voting periods

### Scholarship Pool Contract
- Pool contributions from donors and community members
- Automated distribution based on verified applicant criteria
- Transparent logs of fund usage and recipient progress

---

## Installation

1. Install [Clarinet CLI](https://docs.hiro.so/clarinet/getting-started)
2. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/learnsphere.git
   ```
3. Run tests:
    ```bash
    npm test
    ```
4. Deploy contracts:
    ```bash
    clarinet deploy
    ```

## Usage

Each smart contract operates independently but integrates with others for a complete EdTech experience.
Refer to individual contract documentation for function calls, parameters, and usage examples.

## License

MIT License