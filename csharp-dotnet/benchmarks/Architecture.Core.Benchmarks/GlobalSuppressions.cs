// This file is used by Code Analysis to maintain SuppressMessage
// attributes that are applied to this project.
// Project-level suppressions either have no target or are given
// a specific target and scoped to a namespace, type, member, etc.

using System.Diagnostics.CodeAnalysis;

[assembly: SuppressMessage("Design", "CA1052:Static holder types should be Static or NotInheritable", Justification = "Benchmark runner classes follow BenchmarkDotNet conventions")]
[assembly: SuppressMessage("Performance", "CA1822:Mark members as static", Justification = "BenchmarkDotNet requires instance methods for benchmarks")]
[assembly: SuppressMessage("Globalization", "CA1305:Specify IFormatProvider", Justification = "Performance benchmarks - culture is not relevant")]
[assembly: SuppressMessage("Performance", "CA1861:Avoid constant arrays as arguments", Justification = "Benchmarks measure realistic usage patterns")]