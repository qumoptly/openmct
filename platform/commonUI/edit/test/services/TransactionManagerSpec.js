/*****************************************************************************
 * Open MCT, Copyright (c) 2014-2016, United States Government
 * as represented by the Administrator of the National Aeronautics and Space
 * Administration. All rights reserved.
 *
 * Open MCT is licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * Open MCT includes source code licensed under additional open source
 * licenses. See the Open Source Licenses file (LICENSES.md) included with
 * this source code distribution or the Licensing information page available
 * at runtime from the About dialog for additional information.
 *****************************************************************************/
/*global define,describe,it,expect,beforeEach,jasmine*/

define(
    ["../../src/services/TransactionManager"],
    function (TransactionManager) {
        describe("TransactionManager", function () {
            var mockTransactionService,
                mockDomainObject,
                mockOnCommit,
                mockOnCancel,
                mockRemoves,
                mockPromise,
                manager;

            beforeEach(function () {
                mockRemoves = [];
                mockTransactionService = jasmine.createSpyObj(
                    "transactionService",
                    [ "addToTransaction", "isActive" ]
                );
                mockOnCommit = jasmine.createSpy('commit');
                mockOnCancel = jasmine.createSpy('cancel');
                mockDomainObject = jasmine.createSpyObj(
                    'domainObject',
                    [ 'getId', 'getModel', 'getCapability' ]
                );
                mockDomainObject.getId.andReturn('testId');
                mockPromise = jasmine.createSpyObj('promise', ['then']);

                mockOnCommit.andReturn(mockPromise);
                mockOnCancel.andReturn(mockPromise);

                mockTransactionService.addToTransaction.andCallFake(function () {
                    var mockRemove =
                        jasmine.createSpy('remove-' + mockRemoves.length);
                    mockRemoves.push(mockRemove);
                    return mockRemove;
                });

                manager = new TransactionManager(mockTransactionService);
            });

            it("delegates isActive calls", function () {
                [false, true].forEach(function (state) {
                    mockTransactionService.isActive.andReturn(state);
                    expect(manager.isActive()).toBe(state);
                });
            });

            describe("when addToTransaction is called", function () {
                beforeEach(function () {
                    manager.addToTransaction(
                        mockDomainObject,
                        mockOnCommit,
                        mockOnCancel
                    );
                });

                it("adds callbacks to the active transaction", function () {
                    expect(mockTransactionService.addToTransaction)
                        .toHaveBeenCalledWith(
                            jasmine.any(Function),
                            jasmine.any(Function)
                        );
                });

                it("invokes passed-in callbacks from its own callbacks", function () {
                    expect(mockOnCommit).not.toHaveBeenCalled();
                    mockTransactionService.addToTransaction
                        .mostRecentCall.args[0]();
                    expect(mockOnCommit).toHaveBeenCalled();

                    expect(mockOnCancel).not.toHaveBeenCalled();
                    mockTransactionService.addToTransaction
                        .mostRecentCall.args[1]();
                    expect(mockOnCancel).toHaveBeenCalled();
                });

                it("ignores subsequent calls for the same object", function () {
                    manager.addToTransaction(
                        mockDomainObject,
                        jasmine.createSpy(),
                        jasmine.createSpy()
                    );
                    expect(mockTransactionService.addToTransaction.calls.length)
                        .toEqual(1);
                });

                it("accepts subsequent calls for other objects", function () {
                    mockDomainObject.getId.andReturn('otherId');
                    manager.addToTransaction(
                        mockDomainObject,
                        jasmine.createSpy(),
                        jasmine.createSpy()
                    );
                    expect(mockTransactionService.addToTransaction.calls.length)
                        .toEqual(2);
                });

                it("does not remove callbacks from the transaction", function () {
                    expect(mockRemoves[0]).not.toHaveBeenCalled();
                });

                describe("and clearTransactionsFor is subsequently called", function () {
                    beforeEach(function () {
                        manager.clearTransactionsFor(mockDomainObject);
                    });

                    it("removes callbacks from the transaction", function () {
                        expect(mockRemoves[0]).toHaveBeenCalled();
                    });
                });
            });
        });
    }
);
