 
import { describe, it, expect, beforeEach } from "vitest";

interface MockContract {
	admin: string;
	oracle: string;
	paused: boolean;
	lastTokenId: bigint;
	owners: Map<bigint, string>; // tokenId -> owner
	issuers: Map<bigint, string>;
	metadata: Map<
		bigint,
		{ skills: string[]; grade: string; verifiedAt: bigint }
	>;
	revoked: Map<bigint, boolean>;
	approvals: Map<string, boolean>; // JSON.stringify({tokenId, spender}) -> bool
	isAdmin(caller: string): boolean;
	isOracle(caller: string): boolean;
	setPaused(
		caller: string,
		pause: boolean
	): { value: boolean } | { error: number };
	setOracle(
		caller: string,
		newOracle: string
	): { value: boolean } | { error: number };
	mint(
		caller: string,
		recipient: string,
		skills: string[],
		grade: string
	): { value: bigint } | { error: number };
	updateMetadata(
		caller: string,
		tokenId: bigint,
		newSkills: string[],
		newGrade: string
	): { value: boolean } | { error: number };
	revoke(
		caller: string,
		tokenId: bigint
	): { value: boolean } | { error: number };
	approve(
		caller: string,
		tokenId: bigint,
		spender: string
	): { value: boolean } | { error: number };
	transfer(
		caller: string,
		tokenId: bigint,
		sender: string,
		recipient: string
	): { value: boolean } | { error: number };
	burn(caller: string, tokenId: bigint): { value: boolean } | { error: number };
	getLastTokenId(): { value: bigint };
	getOwner(tokenId: bigint): { value: string | null };
	getMetadata(tokenId: bigint): {
		value: { skills: string[]; grade: string; verifiedAt: bigint } | null;
	};
	isRevoked(tokenId: bigint): { value: boolean };
}

const mockContract: MockContract = {
	admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
	oracle: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
	paused: false,
	lastTokenId: 0n,
	owners: new Map<bigint, string>(),
	issuers: new Map<bigint, string>(),
	metadata: new Map<
		bigint,
		{ skills: string[]; grade: string; verifiedAt: bigint }
	>(),
	revoked: new Map<bigint, boolean>(),
	approvals: new Map<string, boolean>(),

	isAdmin(caller: string) {
		return caller === this.admin;
	},

	isOracle(caller: string) {
		return caller === this.oracle;
	},

	setPaused(caller: string, pause: boolean) {
		if (!this.isAdmin(caller)) return { error: 100 };
		this.paused = pause;
		return { value: pause };
	},

	setOracle(caller: string, newOracle: string) {
		if (!this.isAdmin(caller)) return { error: 100 };
		this.oracle = newOracle;
		return { value: true };
	},

	mint(caller: string, recipient: string, skills: string[], grade: string) {
		if (this.paused) return { error: 103 };
		if (!this.isAdmin(caller)) return { error: 100 };
		const validGrades = [
			"A+",
			"A",
			"A-",
			"B+",
			"B",
			"B-",
			"C+",
			"C",
			"C-",
			"D",
			"F",
			"",
		];
		if (!validGrades.includes(grade)) return { error: 111 };
		this.lastTokenId += 1n;
		const tokenId = this.lastTokenId;
		this.owners.set(tokenId, recipient);
		this.issuers.set(tokenId, caller);
		this.metadata.set(tokenId, { skills, grade, verifiedAt: 100n }); // Mock block-height
		this.revoked.set(tokenId, false);
		return { value: tokenId };
	},

	updateMetadata(
		caller: string,
		tokenId: bigint,
		newSkills: string[],
		newGrade: string
	) {
		if (this.paused) return { error: 103 };
		if (!this.isOracle(caller)) return { error: 108 };
		if (!this.owners.has(tokenId)) return { error: 102 };
		if (this.revoked.get(tokenId)) return { error: 107 };
		const validGrades = [
			"A+",
			"A",
			"A-",
			"B+",
			"B",
			"B-",
			"C+",
			"C",
			"C-",
			"D",
			"F",
			"",
		];
		if (!validGrades.includes(newGrade)) return { error: 111 };
		this.metadata.set(tokenId, {
			skills: newSkills,
			grade: newGrade,
			verifiedAt: 101n,
		});
		return { value: true };
	},

	revoke(caller: string, tokenId: bigint) {
		if (this.paused) return { error: 103 };
		if (!this.owners.has(tokenId)) return { error: 102 };
		if (caller !== (this.issuers.get(tokenId) || "")) return { error: 109 };
		this.revoked.set(tokenId, true);
		return { value: true };
	},

	approve(caller: string, tokenId: bigint, spender: string) {
		if (this.paused) return { error: 103 };
		if (!this.owners.has(tokenId)) return { error: 102 };
		if (this.revoked.get(tokenId)) return { error: 107 };
		if (caller !== (this.owners.get(tokenId) || "")) return { error: 100 };
		const key = JSON.stringify({ tokenId: tokenId.toString(), spender });
		if (this.approvals.get(key)) return { error: 105 };
		this.approvals.set(key, true);
		return { value: true };
	},

	transfer(caller: string, tokenId: bigint, sender: string, recipient: string) {
		if (this.paused) return { error: 103 };
		if (caller !== sender) return { error: 100 };
		if (!this.owners.has(tokenId)) return { error: 102 };
		if (this.revoked.get(tokenId)) return { error: 107 };
		const owner = this.owners.get(tokenId) || "";
		const key = JSON.stringify({
			tokenId: tokenId.toString(),
			spender: caller,
		});
		if (caller !== owner && !this.approvals.get(key)) return { error: 106 };
		this.owners.set(tokenId, recipient);
		this.approvals.delete(key);
		return { value: true };
	},

	burn(caller: string, tokenId: bigint) {
		if (this.paused) return { error: 103 };
		if (!this.owners.has(tokenId)) return { error: 102 };
		const owner = this.owners.get(tokenId) || "";
		const issuer = this.issuers.get(tokenId) || "";
		if (caller !== owner && caller !== issuer) return { error: 100 };
		this.owners.delete(tokenId);
		this.metadata.delete(tokenId);
		this.issuers.delete(tokenId);
		this.revoked.delete(tokenId);
		// Clean approvals not implemented for simplicity
		return { value: true };
	},

	getLastTokenId() {
		return { value: this.lastTokenId };
	},

	getOwner(tokenId: bigint) {
		return { value: this.owners.get(tokenId) || null };
	},

	getMetadata(tokenId: bigint) {
		return { value: this.metadata.get(tokenId) || null };
	},

	isRevoked(tokenId: bigint) {
		return { value: this.revoked.get(tokenId) || false };
	},
};

describe("LearnSphere Credential NFT Contract", () => {
	beforeEach(() => {
		mockContract.admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
		mockContract.oracle = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
		mockContract.paused = false;
		mockContract.lastTokenId = 0n;
		mockContract.owners = new Map();
		mockContract.issuers = new Map();
		mockContract.metadata = new Map();
		mockContract.revoked = new Map();
		mockContract.approvals = new Map();
	});

	it("should mint a new NFT when called by admin", () => {
		const result = mockContract.mint(
			mockContract.admin,
			"ST2CY5V39NHDP5P4VXLZ0N0VVQ1EWBKB7RG6KDIX",
			["Skill1", "Skill2"],
			"A+"
		);
		expect(result).toEqual({ value: 1n });
		expect(mockContract.getOwner(1n)).toEqual({
			value: "ST2CY5V39NHDP5P4VXLZ0N0VVQ1EWBKB7RG6KDIX",
		});
		expect(mockContract.getMetadata(1n).value?.grade).toBe("A+");
	});

	it("should prevent minting when paused", () => {
		mockContract.setPaused(mockContract.admin, true);
		const result = mockContract.mint(
			mockContract.admin,
			"ST2CY5V39NHDP5P4VXLZ0N0VVQ1EWBKB7RG6KDIX",
			["Skill1"],
			"B"
		);
		expect(result).toEqual({ error: 103 });
	});

	it("should prevent minting with invalid grade", () => {
		const result = mockContract.mint(
			mockContract.admin,
			"ST2CY5V39NHDP5P4VXLZ0N0VVQ1EWBKB7RG6KDIX",
			["Skill1"],
			"Z"
		);
		expect(result).toEqual({ error: 111 });
	});

	it("should update metadata when called by oracle", () => {
		mockContract.mint(
			mockContract.admin,
			"ST2CY5V39NHDP5P4VXLZ0N0VVQ1EWBKB7RG6KDIX",
			["Skill1"],
			"A+"
		);
		const result = mockContract.updateMetadata(
			mockContract.oracle,
			1n,
			["NewSkill"],
			"A"
		);
		expect(result).toEqual({ value: true });
		expect(mockContract.getMetadata(1n).value?.grade).toBe("A");
	});

	it("should prevent metadata update by non-oracle", () => {
		mockContract.mint(
			mockContract.admin,
			"ST2CY5V39NHDP5P4VXLZ0N0VVQ1EWBKB7RG6KDIX",
			["Skill1"],
			"A+"
		);
		const result = mockContract.updateMetadata(
			"ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP",
			1n,
			["NewSkill"],
			"A"
		);
		expect(result).toEqual({ error: 108 });
	});

	it("should prevent metadata update with invalid grade", () => {
		mockContract.mint(
			mockContract.admin,
			"ST2CY5V39NHDP5P4VXLZ0N0VVQ1EWBKB7RG6KDIX",
			["Skill1"],
			"A+"
		);
		const result = mockContract.updateMetadata(
			mockContract.oracle,
			1n,
			["NewSkill"],
			"Z"
		);
		expect(result).toEqual({ error: 111 });
	});

	it("should revoke NFT when called by issuer", () => {
		mockContract.mint(
			mockContract.admin,
			"ST2CY5V39NHDP5P4VXLZ0N0VVQ1EWBKB7RG6KDIX",
			["Skill1"],
			"A+"
		);
		const result = mockContract.revoke(mockContract.admin, 1n);
		expect(result).toEqual({ value: true });
		expect(mockContract.isRevoked(1n)).toEqual({ value: true });
	});

	it("should approve spender for transfer", () => {
		mockContract.mint(
			mockContract.admin,
			"ST2CY5V39NHDP5P4VXLZ0N0VVQ1EWBKB7RG6KDIX",
			["Skill1"],
			"A+"
		);
		const result = mockContract.approve(
			"ST2CY5V39NHDP5P4VXLZ0N0VVQ1EWBKB7RG6KDIX",
			1n,
			"ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP"
		);
		expect(result).toEqual({ value: true });
	});

	it("should transfer NFT by owner", () => {
		mockContract.mint(
			mockContract.admin,
			"ST2CY5V39NHDP5P4VXLZ0N0VVQ1EWBKB7RG6KDIX",
			["Skill1"],
			"A+"
		);
		const result = mockContract.transfer(
			"ST2CY5V39NHDP5P4VXLZ0N0VVQ1EWBKB7RG6KDIX",
			1n,
			"ST2CY5V39NHDP5P4VXLZ0N0VVQ1EWBKB7RG6KDIX",
			"ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP"
		);
		expect(result).toEqual({ value: true });
		expect(mockContract.getOwner(1n)).toEqual({
			value: "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP",
		});
	});

	it("should burn NFT by owner", () => {
		mockContract.mint(
			mockContract.admin,
			"ST2CY5V39NHDP5P4VXLZ0N0VVQ1EWBKB7RG6KDIX",
			["Skill1"],
			"A+"
		);
		const result = mockContract.burn(
			"ST2CY5V39NHDP5P4VXLZ0N0VVQ1EWBKB7RG6KDIX",
			1n
		);
		expect(result).toEqual({ value: true });
		expect(mockContract.getOwner(1n)).toEqual({ value: null });
	});

	it("should burn NFT by issuer", () => {
		mockContract.mint(
			mockContract.admin,
			"ST2CY5V39NHDP5P4VXLZ0N0VVQ1EWBKB7RG6KDIX",
			["Skill1"],
			"A+"
		);
		const result = mockContract.burn(mockContract.admin, 1n);
		expect(result).toEqual({ value: true });
		expect(mockContract.getOwner(1n)).toEqual({ value: null });
	});

	it("should prevent transfer of revoked NFT", () => {
		mockContract.mint(
			mockContract.admin,
			"ST2CY5V39NHDP5P4VXLZ0N0VVQ1EWBKB7RG6KDIX",
			["Skill1"],
			"A+"
		);
		mockContract.revoke(mockContract.admin, 1n);
		const result = mockContract.transfer(
			"ST2CY5V39NHDP5P4VXLZ0N0VVQ1EWBKB7RG6KDIX",
			1n,
			"ST2CY5V39NHDP5P4VXLZ0N0VVQ1EWBKB7RG6KDIX",
			"ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP"
		);
		expect(result).toEqual({ error: 107 });
	});
});